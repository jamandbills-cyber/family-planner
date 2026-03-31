import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToken, getFamilyMembers } from '@/lib/sheets'
import { getWeekCalendarEvents, getWeekRange } from '@/lib/google-calendar'
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

  if (!accessToken) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    // 1. Validate token
    const tokenRecord = await getToken(accessToken, token)
    if (!tokenRecord || tokenRecord.formType !== 'adult') {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // 2. Get family member
    const members = await getFamilyMembers(accessToken)
    const member  = members.find(m => m.id === tokenRecord.memberId)
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // 3. Load saved admin state (has transport assignments set by admin)
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
      console.warn('Could not load admin state, falling back to calendar:', err)
    }

    // 4. If no admin state, fall back to raw calendar
    let events = adminEvents
    let weekStartDate: Date
    let weekEndDate: Date

    if (events.length === 0) {
      const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
      const result = await getWeekCalendarEvents(accessToken, calendarId)
      events = result.events
      weekStartDate = result.weekStart
      weekEndDate   = result.weekEnd
    } else {
      const range = getWeekRange(new Date(weekStart + 'T00:00:00'))
      weekStartDate = range.weekStart
      weekEndDate   = range.weekEnd
    }

    const weekLabel = `Week of ${format(weekStartDate, 'MMM d')} – ${format(weekEndDate, 'MMM d, yyyy')}`

    // 5. Events that need driving
    const driveEvents = events
      .filter((e: any) => e.transportStatus === 'needs_driver')
      .map((e: any) => ({
        id:          e.id,
        title:       e.title,
        day:         WEEK_DAYS[e.dayIdx],
        time:        e.time,
        location:    e.location ?? '',
        standingRule: e.standingRuleId != null && e.driverId === member.id,
      }))

    // 6. All events for awareness
    const allCalEvents = events.map((e: any) => ({
      title: e.title,
      day:   WEEK_DAYS[e.dayIdx],
      time:  e.time,
      note:  e.driverId === member.id
               ? 'You driving'
               : e.transportStatus === 'needs_driver' && !e.driverId
               ? 'Driver needed'
               : '',
    }))

    return NextResponse.json({
      name:        member.name,
      memberId:    member.id,
      weekLabel,
      driveEvents,
      allCalEvents,
    })
  } catch (err) {
    console.error('Adult form data error:', err)
    return NextResponse.json({ error: 'Failed to load form data' }, { status: 500 })
  }
}
