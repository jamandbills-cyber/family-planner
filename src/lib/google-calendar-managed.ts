import type { calendar_v3 } from 'googleapis'

/** Private extended property — stable upsert key per week + app event id */
export const FAMILY_PLANNER_ID_PROP = 'familyPlannerId'

const HOUSEHOLD_TZ = process.env.HOUSEHOLD_TIME_ZONE ?? 'America/Denver'

export function makeFamilyPlannerId(weekStart: string, sourceId: string) {
  return `${weekStart}:${sourceId}`
}

export function isSchoolSourceId(sourceId?: string | null) {
  return typeof sourceId === 'string' && sourceId.startsWith('school_')
}

export function isSchoolPlanEvent(sourceId?: string | null, title?: string) {
  if (isSchoolSourceId(sourceId)) return true
  const t = (title ?? '').toLowerCase()
  return (
    t.startsWith('school drop-off') ||
    t.startsWith('school pick-up') ||
    t.startsWith('school pickup')
  )
}

export function inferSchoolSourceId(title: string, dayIdx: number): string | null {
  const t = title.toLowerCase()
  if (t.includes('drop-off') || (t.includes('school') && t.includes('drop'))) {
    return `school_drop_${dayIdx}`
  }
  if (t.includes('pick-up') || t.includes('pickup')) {
    return `school_pickup_${dayIdx}`
  }
  return null
}

export function googleEventIdFromSource(sourceId?: string | null) {
  if (!sourceId || sourceId.startsWith('school_') || sourceId.startsWith('off-')) return null
  return sourceId.split('#')[0] ?? null
}

type Calendar = calendar_v3.Calendar

export async function listEventsByPlannerId(
  calendar: Calendar,
  calendarId: string,
  plannerId: string,
): Promise<calendar_v3.Schema$Event[]> {
  const res = await calendar.events.list({
    calendarId,
    privateExtendedProperty: `${FAMILY_PLANNER_ID_PROP}=${plannerId}`,
    singleEvents: true,
    maxResults: 25,
  })
  return res.data.items ?? []
}

export async function listDayEvents(
  calendar: Calendar,
  calendarId: string,
  dateStr: string,
): Promise<calendar_v3.Schema$Event[]> {
  const res = await calendar.events.list({
    calendarId,
    timeMin: `${dateStr}T00:00:00`,
    timeMax: `${dateStr}T23:59:59`,
    singleEvents: true,
    maxResults: 50,
    timeZone: HOUSEHOLD_TZ,
  })
  return res.data.items ?? []
}

/** Keep one managed event; delete any extras with the same familyPlannerId. */
export async function dedupeManagedEvents(
  calendar: Calendar,
  calendarId: string,
  events: calendar_v3.Schema$Event[],
): Promise<{ kept: calendar_v3.Schema$Event | null; removed: number }> {
  if (events.length === 0) return { kept: null, removed: 0 }
  const [keep, ...dupes] = events
  let removed = 0
  for (const dup of dupes) {
    if (!dup.id) continue
    try {
      await calendar.events.delete({ calendarId, eventId: dup.id })
      removed++
    } catch (err) {
      console.error('Failed to remove duplicate calendar event:', dup.id, err)
    }
  }
  return { kept: keep ?? null, removed }
}

export function findLegacySchoolMatches(
  dayEvents: calendar_v3.Schema$Event[],
  title: string,
  plannerId: string,
): calendar_v3.Schema$Event[] {
  const want = title.toLowerCase().trim()
  const isDrop = want.includes('drop')
  const isPick = want.includes('pick-up') || want.includes('pickup')

  return dayEvents.filter(e => {
    const existingPlannerId = e.extendedProperties?.private?.[FAMILY_PLANNER_ID_PROP]
    if (existingPlannerId && existingPlannerId !== plannerId) return false

    const summary = (e.summary ?? '').toLowerCase()
    if (!summary.includes('school')) return false
    if (isDrop && !summary.includes('drop')) return false
    if (isPick && !summary.includes('pick') && !summary.includes('pickup')) return false
    if (!isDrop && !isPick) {
      return summary.includes(want) || want.includes(summary)
    }
    return true
  })
}

export function managedEventBody(
  plannerId: string,
  summary: string,
  description: string,
  start: { dateTime: string; timeZone: string },
  end: { dateTime: string; timeZone: string },
  colorId?: string,
): calendar_v3.Schema$Event {
  return {
    summary,
    description,
    start,
    end,
    colorId,
    extendedProperties: {
      private: {
        [FAMILY_PLANNER_ID_PROP]: plannerId,
      },
    },
  }
}

export { HOUSEHOLD_TZ }
