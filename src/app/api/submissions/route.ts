import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!

function getServiceClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
  const key = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function GET(req: NextRequest) {
  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
  }

  try {
    const sheets = getServiceClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Submissions!A2:E1000',
    })

    const rows = (res.data.values ?? []) as string[][]

    const parsed = rows
      .filter(r => r[3] === weekStart)
      .map(r => ({
        submittedAt: r[0],
        memberId:    r[1],
        formType:    r[2],
        weekStart:   r[3],
        payload:     (() => {
          try { return JSON.parse(r[4] ?? '{}') }
          catch { return {} }
        })(),
      }))

    // Keep only most recent per member
    const byMember = new Map<string, typeof parsed[0]>()
    for (const sub of parsed) {
      const existing = byMember.get(sub.memberId)
      if (!existing || sub.submittedAt > existing.submittedAt) {
        byMember.set(sub.memberId, sub)
      }
    }

    return NextResponse.json({ submissions: Array.from(byMember.values()) })
  } catch (err) {
    console.error('Submissions fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
