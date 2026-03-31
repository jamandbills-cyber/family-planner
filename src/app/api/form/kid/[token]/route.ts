import { NextRequest, NextResponse } from 'next/server'
import { getWeekRange } from '@/lib/google-calendar'
import { google } from 'googleapis'
import { format } from 'date-fns'

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

async function readSheet(range: string): Promise<string[][]> {
  const sheets = getServiceClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID,
    range,
  })
  return (res.data.values ?? []) as string[][]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    // 1. Validate token
    const tokenRows = await readSheet('Tokens!A2:E500')
    const tokenRow  = tokenRows.find(r => r[0] === token)
    if (!tokenRow || tokenRow[3] !== 'kid') {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }
    const memberId  = tokenRow[1]
    const weekStart = tokenRow[2]

    // 2. Get family member
    const familyRows = await readSheet('Family!A2:F100')
    const memberRow  = familyRows.find(r => r[0] === memberId)
    if (!memberRow) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    const member = { id: memberRow[0], name: memberRow[1] }

    // 3. Get all family names for driver display
    const allMembers = familyRows
      .filter(r => r[0])
      .map(r => ({ id: r[0], name: r[1] }))

    // 4. Load admin state
    let adminEvents: any[] = []
    try {
      const stateRows = await readSheet('AdminState!A2:C200')
      const stateRow = stateRows
        .filter(r => r[0] === weekStart)
        .sort((a, b) => b[1].localeCompare(a[1]))[0]
      if (stateRow?.[2]) {
        const state = JSON.parse(stateRow[2])
        adminEvents = state.events ?? []
      }
    } catch (err) {
      console.warn('Could not load admin state:', err)
    }

    const range     = getWeekRange(new Date(weekStart + 'T00:00:00'))
    const weekLabel = `Week of ${format(range.weekStart, 'MMM d')} – ${format(range.weekEnd, 'MMM d, yyyy')}`

    // 5. Build events by day
    const eventsByDay: Record<number, any[]> = {}
    for (let i = 0; i < 7; i++) eventsByDay[i] = []
    for (const e of adminEvents) {
      if (e.dayIdx === undefined) continue
      eventsByDay[e.dayIdx].push({
        id:      e.id,
        title:   e.title,
        time:    e.time,
        sortMin: e.sortMin ?? 0,
        isYours: (e.involvedIds ?? []).includes(member.id),
        driver:  allMembers.find(m => m.id === e.driverId)?.name ?? null,
      })
    }

    return NextResponse.json({
      name: member.name,
      memberId: member.id,
      weekLabel,
      weekStart,
      eventsByDay,
    })
  } catch (err) {
    console.error('Kid form error:', err)
    return NextResponse.json({ error: 'Failed to load form data' }, { status: 500 })
  }
}
