import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { addDays, format, startOfWeek } from 'date-fns'

export const dynamic = 'force-dynamic'

type DinnerRow = { dayIdx: number; meal: string; cook: string }

async function tryReadFromSupabase(weekStart: string): Promise<DinnerRow[] | null> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('sunday_plans')
      .select('state')
      .eq('week_start', weekStart)
      .maybeSingle()
    if (error || !data) return null
    const dinner = (data as any)?.state?.dinner
    if (Array.isArray(dinner) && dinner.length > 0) return dinner
    return null
  } catch {
    return null
  }
}

export async function GET() {
  const displayStart = new Date(new Date().toDateString())
  const displayEnd = addDays(displayStart, 6)
  const firstPlanWeekStart = startOfWeek(displayStart, { weekStartsOn: 0 })
  const secondPlanWeekStart = startOfWeek(displayEnd, { weekStartsOn: 0 })
  const planStarts = [firstPlanWeekStart]
  if (format(firstPlanWeekStart, 'yyyy-MM-dd') !== format(secondPlanWeekStart, 'yyyy-MM-dd')) {
    planStarts.push(secondPlanWeekStart)
  }

  const plans = await Promise.all(
    planStarts.map(async planStart => ({
      planStart,
      dinner: await tryReadFromSupabase(format(planStart, 'yyyy-MM-dd')) ?? [],
    }))
  )

  const dinner = plans.flatMap(({ planStart, dinner }) =>
    dinner.map(slot => {
      const slotDate = addDays(planStart, slot.dayIdx)
      const dayIdx = Math.floor(
        (new Date(slotDate.toDateString()).getTime() - new Date(displayStart.toDateString()).getTime()) / 86400000
      )
      return { ...slot, dayIdx }
    }).filter(slot => slot.dayIdx >= 0 && slot.dayIdx <= 6)
  )

  return NextResponse.json({ dinner, weekStart: format(displayStart, 'yyyy-MM-dd') })
}
