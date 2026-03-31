import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWeekCalendarEvents } from '@/lib/google-calendar'
import { addWeeks, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Support weekOffset=0 (this week), 1 (next week), etc.
  const offsetParam = req.nextUrl.searchParams.get('weekOffset')
  const weekOffset  = Math.min(Math.max(parseInt(offsetParam ?? '0', 10) || 0, 0), 8)
  const referenceDate = addWeeks(new Date(), weekOffset)

  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  try {
    const { events, weekStart, weekEnd } = await getWeekCalendarEvents(
      session.accessToken,
      calendarId,
      referenceDate
    )

    return NextResponse.json({
      events,
      weekStart:  format(weekStart, 'yyyy-MM-dd'),
      weekEnd:    format(weekEnd,   'yyyy-MM-dd'),
      weekOffset,
      syncedAt:   new Date().toISOString(),
    })
  } catch (err) {
    console.error('Calendar fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}
