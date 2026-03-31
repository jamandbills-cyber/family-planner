import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToken, getFamilyMembers } from '@/lib/sheets'
import { getWeekCalendarEvents } from '@/lib/google-calendar'
import { format } from 'date-fns'

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

    // 3. Get calendar events
    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
    const { events, weekStart, weekEnd } = await getWeekCalendarEvents(accessToken, calendarId)

    const weekLabel = `Week of ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

    // 4. Events that need driving (transport = needs_driver)
    const driveEvents = events
      .filter(e => e.transportStatus === 'needs_driver')
      .map(e => ({
        id:          e.id,
        title:       e.title,
        day:         WEEK_DAYS[e.dayIdx],
        time:        e.time,
        location:    e.location ?? '',
        standingRule: e.standingRuleId !== null && e.driverId === member.id,
      }))

    // 5. All calendar events for awareness
    const allCalEvents = events.map(e => ({
      title:    e.title,
      day:      WEEK_DAYS[e.dayIdx],
      time:     e.time,
      note:     e.driverId === member.id
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
