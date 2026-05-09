import { NextRequest, NextResponse } from 'next/server'
import { getWeekRange } from '@/lib/google-calendar'
import { format } from 'date-fns'
import { getSundayPlan } from '@/lib/sunday-plan'
import { getPlanningMembers, getPlanningToken } from '@/lib/planning-data'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const tokenRecord = await getPlanningToken(token, 'kid')
    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }
    const member = tokenRecord.member
    const weekStart = tokenRecord.weekStart
    const allMembers = await getPlanningMembers()

    const planState = await getSundayPlan(weekStart)
    const adminEvents: any[] = planState?.events ?? []

    const range     = getWeekRange(new Date(weekStart + 'T00:00:00'))
    const weekLabel = `Week of ${format(range.weekStart, 'MMM d')} – ${format(range.weekEnd, 'MMM d, yyyy')}`

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
        driver:  allMembers.find(m => m.id === e.driverId)?.name ?? '',
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
