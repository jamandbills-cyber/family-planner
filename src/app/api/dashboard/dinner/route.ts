import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type DinnerRow = { dayIdx: number; meal: string; cook: string }

function getCurrentWeekStart(): string {
  const today = new Date()
  // Sunday-start week
  const day = today.getDay()
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day)
  const y = sunday.getFullYear()
  const m = String(sunday.getMonth() + 1).padStart(2, '0')
  const d = String(sunday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

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
  const weekStart = getCurrentWeekStart()
  const dinner = await tryReadFromSupabase(weekStart) ?? []
  return NextResponse.json({ dinner, weekStart })
}
