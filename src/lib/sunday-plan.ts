import 'server-only'
import { getSupabaseAdmin } from './supabase'

// Shape of the saved snapshot. Matches what AdminSetupClient builds in getSnapshot().
// Kept as `any` for events/dinner/agenda since their internal shapes live in
// src/lib/types.ts and we don't strictly type-check them at this boundary.
export type SundayPlanState = {
  events?: any[]
  schoolConfig?: any
  dinner?: any[]
  agenda?: string[]
  deadline?: string
  deadlineDay?: 'saturday' | 'sunday'
  isReady?: boolean
}

// Returns the saved state for a given weekStart (YYYY-MM-DD Sunday), or null
// if no plan has been saved for that week yet.
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

// Upsert the entire state snapshot for a week.
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
