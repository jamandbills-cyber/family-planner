import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!

function getServiceClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
  const key = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function POST(req: NextRequest) {
  try {
    const { token, payload } = await req.json()
    if (!token || !payload) {
      return NextResponse.json({ error: 'Missing token or payload' }, { status: 400 })
    }

    const sheets = getServiceClient()

    // Validate token
    const tokenRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Tokens!A2:E500',
    })
    const tokenRows = (tokenRes.data.values ?? []) as string[][]
    const tokenRow  = tokenRows.find(r => r[0] === token)
    if (!tokenRow || tokenRow[3] !== 'kid') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const memberId  = tokenRow[1]
    const weekStart = tokenRow[2]

    // Save submission
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_ID,
      range: 'Submissions!A:E',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          new Date().toISOString(),
          memberId,
          'kid',
          weekStart,
          JSON.stringify(payload),
        ]]
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Kid submit error:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
