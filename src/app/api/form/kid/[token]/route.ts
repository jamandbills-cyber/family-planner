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

  // Need an access token to read Sheets + Calendar
  // For form pages we use the admin's stored session
  const session = await getServerSession(authOptions)
  const accessToken = session?.accessToken

  if (!accessToken) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    // 1. Validate the token
    const tokenRecord = await getToken(accessToken, token)
    if (!tokenRecord || tokenRecord.formType !== 'kid') {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // 2. Get family member info
    const members = await getFamilyMembers(accessToken)
    const member  = members.find(m => m.id === tokenRecord.memberId)
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // 3. Get this week's calendar events
    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
    const { events, weekStart, weekEnd } = await getWeekCalendarEvents(accessToken, calendarId)

    const weekLabel = `Week of ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

    // 4. Format calendar events for the form
    const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const calEvents = events.map(evt => ({
      title:   evt.title,
      day:     WEEK_DAYS[evt.dayIdx],
      time:    evt.time,
      isYours: evt.involvedIds.includes(member.id),
    }))

    return NextResponse.json({
      name:      member.name,
      memberId:  member.id,
      weekLabel,
      calEvents,
    })
  } catch (err) {
    console.error('Kid form data error:', err)
    return NextResponse.json({ error: 'Failed to load form data' }, { status: 500 })
  }
}
