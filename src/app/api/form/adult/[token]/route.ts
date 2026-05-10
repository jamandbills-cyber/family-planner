import { NextRequest, NextResponse } from 'next/server'
import { getWeekRange } from '@/lib/google-calendar'
import { format } from 'date-fns'
import { getSundayPlan } from '@/lib/sunday-plan'
import { getPlanningToken } from '@/lib/planning-data'
const DAY_MAP: Record<number, string> = { 1:'Monday', 2:'Tuesday', 3:'Wednesday', 4:'Thursday', 5:'Friday' }

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const tokenRecord = await getPlanningToken(token, 'adult')
    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }
    const member = tokenRecord.member
    const weekStart = tokenRecord.weekStart

    // Load admin state from Supabase
    const planState = await getSundayPlan(weekStart)
    const adminEvents: any[] = planState?.events ?? []

    const range     = getWeekRange(new Date(weekStart + 'T00:00:00'))
    const weekLabel = `Week of ${format(range.weekStart, 'MMM d')} – ${format(range.weekEnd, 'MMM d, yyyy')}`

    const eventsByDay: Record<number, any[]> = {}
    for (let i = 0; i < 7; i++) eventsByDay[i] = []
    for (const e of adminEvents) {
      if (e.dayIdx === undefined) continue
      eventsByDay[e.dayIdx].push({
        id:              e.id,
        title:           e.title,
        time:            e.time,
        sortMin:         e.sortMin ?? 0,
        location:        e.location ?? '',
        transportStatus: e.transportStatus ?? 'unset',
        transportType:   e.transportType ?? 'ride',
        driverId:        e.driverId ?? null,
        needsDriver:     e.transportStatus === 'needs_driver' && !e.driverId && !e.id?.startsWith('school_'),
        amDriver:        e.transportStatus === 'needs_driver' && e.driverId === member.id && !e.id?.startsWith('school_'),
      })
    }

    const schoolDefaults: Record<string, { am: boolean; pm: boolean }> = {
      Monday:    { am: false, pm: false },
      Tuesday:   { am: false, pm: false },
      Wednesday: { am: false, pm: false },
      Thursday:  { am: false, pm: false },
      Friday:    { am: false, pm: false },
    }
    for (const e of adminEvents) {
      if (!e.id?.startsWith('school_')) continue
      const dayName = DAY_MAP[e.dayIdx]
      if (!dayName || e.driverId !== member.id) continue
      if (e.id.startsWith('school_drop_'))   schoolDefaults[dayName].am = true
      if (e.id.startsWith('school_pickup_')) schoolDefaults[dayName].pm = true
    }

    return NextResponse.json({
      name: member.name,
      memberId: member.id,
      weekLabel,
      weekStart,
      eventsByDay,
      schoolDefaults,
    })
  } catch (err) {
    console.error('Adult form error:', err)
    return NextResponse.json({ error: 'Failed to load form data' }, { status: 500 })
  }
}
