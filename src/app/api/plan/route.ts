import { NextResponse } from 'next/server'
import { google } from 'googleapis'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!

function getServiceClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function GET() {
  try {
    const sheets = getServiceClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Plans!A2:C100',
    })
    const rows = (res.data.values ?? []) as string[][]
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No plan found' }, { status: 404 })
    }
    // Get the most recent plan (last row)
    const last = rows[rows.length - 1]
    const plan = JSON.parse(last[2] ?? '{}')
    return NextResponse.json({ plan, weekStart: last[0], confirmedAt: last[1] })
  } catch (err) {
    console.error('Plan fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 })
  }
}
