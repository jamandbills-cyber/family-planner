import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToken, getFamilyMembers } from '@/lib/sheets'
import { getWeekRange } from '@/lib/google-calendar'
import { google } from 'googleapis'
import { format } from 'date-fns'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!
const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const session = await getServerSession(authOptions)
  const accessToken = session?.accessToken
  if (!accessToken) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  try {
    const tokenRecord = await getToken(accessToken, token)
    if (!tokenRecord || tokenRecord.formType !== 'kid') {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    const members = await getFamilyMembers(accessToken)
    const member  = members.find(m => m.id === tokenRecord.memberId)
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Load admin state
    const weekStart = tokenRecord.weekStart
    let adminEvents: any[] = []
    try {
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })
      const sheets = google.sheets({ version: 'v4', auth })
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEETS_ID,
        range: 'AdminState!A2:C200',
      })
      const rows = (res.data.values ?? []) as string[][]
      const row = rows
        .filter(r => r[0] === weekStart)
        .sort((a, b) => b[1].localeCompare(a[1]))[0]
      if (row?.[2]) {
        const state = JSON.parse(row[2])
        adminEvents = state.events ?? []
      }
    } catch (err) {
      console.warn('Could not load admin state:', err)
    }

    const range = getWeekRange(new Date(weekStart + 'T00:00:00'))
    const weekLabel = `Week of ${format(range.weekStart, 'MMM d')} – ${format(range.weekEnd, 'MMM d, yyyy')}`

    // Build events by day
    const eventsByDay: Record<number, any[]> = {}
    for (let i = 0; i < 7; i++) eventsByDay[i] = []

    for (const e of adminEvents) {
      if (e.dayIdx === undefined) continue
      eventsByDay[e.dayIdx].push({
        id:       e.id,
        title:    e.title,
        time:     e.time,
        isYours:  (e.involvedIds ?? []).includes(member.id),
        driver:   members.find((m: any) => m.id === e.driverId)?.name ?? null,
      })
    }

    return NextResponse.json({
      name:       member.name,
      memberId:   member.id,
      weekLabel,
      weekStart,
      eventsByDay,
    })
  } catch (err) {
    console.error('Kid form error:', err)
    return NextResponse.json({ error: 'Failed to load form data' }, { status: 500 })
  }
}
