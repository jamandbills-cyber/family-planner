// Calendar event type for the dashboard side.
// Distinct from src/lib/types.ts CalendarEvent (which only has display strings)
// because the dashboard grid needs real start/end timestamps to position events.

export type DashboardCalendarEvent = {
  id: string
  title: string
  startISO: string         // full ISO string with timezone, e.g. "2026-05-04T14:00:00-06:00"
  endISO: string
  allDay: boolean
  location?: string
  description?: string
  // Day index relative to the week start (0..6), Sunday=0
  dayIdx: number
  // Minutes from midnight on dayIdx (0 for all-day, used for sorting + positioning)
  startMinutes: number
  endMinutes: number
  // Optional category for color coding. Maps to a hex via the calendar theme.
  category?: string
  // Color override (hex) — if set, used directly instead of category lookup
  colorOverride?: string
}

export type WeekRange = {
  weekStart: string        // ISO date "YYYY-MM-DD" of Sunday
  weekEnd: string          // ISO date "YYYY-MM-DD" of Saturday
  events: DashboardCalendarEvent[]
  syncedAt: string
}
