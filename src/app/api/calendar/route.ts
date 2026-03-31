import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWeekCalendarEvents } from '@/lib/google-calendar'
import { format } from 'date-fns'

export async function GET() {
  // 1. Require authentication
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch this week's events from Google Calendar
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  try {
    const { events, weekStart, weekEnd } = await getWeekCalendarEvents(
      session.accessToken,
      calendarId
    )

    return NextResponse.json({
      events,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd:   format(weekEnd,   'yyyy-MM-dd'),
      syncedAt:  new Date().toISOString(),
    })
  } catch (err) {
    console.error('Calendar fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}
