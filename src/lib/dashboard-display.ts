import 'server-only'

import { addDays, format, startOfWeek } from 'date-fns'
import { getSupabaseAdmin } from './supabase'
import { fetchWeekCalendar } from './dashboard-calendar'
import { getKitchenColumns } from './dashboard-data'
import type {
  DisplayDinnerSlot,
  DisplaySourceStatus,
  HouseholdDisplayData,
} from './types/display'

const STALE_AFTER = {
  calendar: 2 * 60_000,
  columns: 45_000,
  dinner: 2 * 60_000,
  photos: 10 * 60_000,
}

function status(ok: boolean, staleAfterMs: number, error?: unknown): DisplaySourceStatus {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined
  return {
    ok,
    syncedAt: new Date().toISOString(),
    staleAfterMs,
    ...(message ? { error: message } : {}),
  }
}

async function getDisplayPhotos(): Promise<string[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .storage
    .from('family-photos')
    .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) throw error

  return (data ?? [])
    .filter(f => !f.name.startsWith('.'))
    .map(f => {
      const { data: pub } = supabase
        .storage
        .from('family-photos')
        .getPublicUrl(f.name)
      return pub.publicUrl
    })
}

async function getDinnerForWeek(weekStart: string): Promise<DisplayDinnerSlot[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('sunday_plans')
    .select('state')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (error) throw error
  const dinner = (data as any)?.state?.dinner
  return Array.isArray(dinner) ? dinner : []
}

export async function getRollingDinner(): Promise<DisplayDinnerSlot[]> {
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
      dinner: await getDinnerForWeek(format(planStart, 'yyyy-MM-dd')),
    }))
  )

  return plans.flatMap(({ planStart, dinner }) =>
    dinner.map(slot => {
      const slotDate = addDays(planStart, slot.dayIdx)
      const dayIdx = Math.floor(
        (new Date(slotDate.toDateString()).getTime() - new Date(displayStart.toDateString()).getTime()) / 86400000
      )
      return { ...slot, dayIdx }
    }).filter(slot => slot.dayIdx >= 0 && slot.dayIdx <= 6)
  )
}

export async function getHouseholdDisplayData(): Promise<HouseholdDisplayData> {
  const [
    calendarResult,
    kitchenResult,
    dinnerResult,
    photosResult,
  ] = await Promise.allSettled([
    fetchWeekCalendar(0),
    getKitchenColumns(),
    getRollingDinner(),
    getDisplayPhotos(),
  ])

  const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value : null
  const kitchen = kitchenResult.status === 'fulfilled' ? kitchenResult.value : null
  const dinner = dinnerResult.status === 'fulfilled' ? dinnerResult.value : []
  const photos = photosResult.status === 'fulfilled' ? photosResult.value : []

  return {
    calendar,
    columns: kitchen?.columns ?? [],
    members: kitchen?.members ?? [],
    dinner,
    photos,
    sources: {
      calendar: status(calendarResult.status === 'fulfilled', STALE_AFTER.calendar, calendarResult.status === 'rejected' ? calendarResult.reason : undefined),
      columns: status(kitchenResult.status === 'fulfilled' && !!kitchen, STALE_AFTER.columns, kitchenResult.status === 'rejected' ? kitchenResult.reason : undefined),
      dinner: status(dinnerResult.status === 'fulfilled', STALE_AFTER.dinner, dinnerResult.status === 'rejected' ? dinnerResult.reason : undefined),
      photos: status(photosResult.status === 'fulfilled', STALE_AFTER.photos, photosResult.status === 'rejected' ? photosResult.reason : undefined),
    },
    syncedAt: new Date().toISOString(),
  }
}
