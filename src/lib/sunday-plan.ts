import 'server-only'
import { getSupabaseAdmin } from './supabase'

export type SundayPlanState = {
  events?: any[]
  schoolConfig?: any
  dinner?: any[]
  agenda?: string[]
  deadline?: string
  deadlineDay?: 'saturday' | 'sunday'
  isReady?: boolean
}

export async function getSundayPlan(weekStart: string): Promise<SundayPlanState | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('sunday_plans')
    .select('state')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (error) {
    console.warn('getSundayPlan error:', error.message)
    return null
  }
  return (data?.state as SundayPlanState) ?? null
}

export async function saveSundayPlan(weekStart: string, state: SundayPlanState) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('sunday_plans')
    .upsert({
      week_start: weekStart,
      state,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'week_start' })

  if (error) throw new Error(`saveSundayPlan: ${error.message}`)
}
