import { google } from 'googleapis'
import { startOfWeek, endOfWeek, isValid } from 'date-fns'
import { getDaySpanSlices, julianDay, parseLocalParts } from '@/lib/calendar-day-span'
import type { CalendarEvent, GoogleCalendarEvent } from './types'

// ─── Week starts on Sunday (0), ends on Saturday ─────────────
export function getWeekRange(referenceDate: Date = new Date()) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 }) // Sunday
  const weekEnd   = endOfWeek(referenceDate,   { weekStartsOn: 0 }) // Saturday
  return { weekStart, weekEnd }
}

// ─── Format hours/minutes to "8:00 AM" style ─────────────────
function formatLocalTime(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 === 0 ? 12 : hours % 12
  const m = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`
  return `${h}${m} ${period}`
}

// ─── Fetch raw events from Google Calendar API ────────────────
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<GoogleCalendarEvent[]> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.list({
    calendarId,
    timeMin: weekStart.toISOString(),
    timeMax: weekEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  })

  return (response.data.items ?? []) as GoogleCalendarEvent[]
}

function sliceTimeLabel(startMinutes: number, endMinutes: number, allDay: boolean): string {
  if (allDay) return 'All Day'
  const start = formatLocalTime(Math.floor(startMinutes / 60), startMinutes % 60)
  const end = formatLocalTime(Math.floor(endMinutes / 60), endMinutes % 60)
  return `${start}–${end}`
}

// ─── Convert a Google Calendar event to our CalendarEvent(s) ─
export function transformGoogleEvent(
  raw: GoogleCalendarEvent,
  weekStart: Date
): CalendarEvent[] {
  const startStr = raw.start?.dateTime ?? raw.start?.date
  const endStr   = raw.end?.dateTime   ?? raw.end?.date
  if (!startStr || !raw.id) return []

  const startParts = parseLocalParts(startStr)
  const endParts   = endStr ? parseLocalParts(endStr) : startParts

  const wsYear  = weekStart.getUTCFullYear()
  const wsMonth = weekStart.getUTCMonth()
  const wsDay   = weekStart.getUTCDate()
  const wsJulian = julianDay(wsYear, wsMonth, wsDay)

  const slices = getDaySpanSlices(startParts, endParts, wsJulian)
  if (slices.length === 0) return []

  const spanDays = slices.length > 1

  return slices.map(slice => ({
    id: spanDays ? `${raw.id}#${slice.dayIdx}` : raw.id!,
    title: raw.summary ?? 'Untitled event',
    dayIdx: slice.dayIdx,
    time: sliceTimeLabel(slice.startMinutes, slice.endMinutes, slice.allDay),
    sortMin: slice.allDay ? 0 : slice.startMinutes,
    location: raw.location,
    allDay: slice.allDay,
    involvedIds: [],
    transportStatus: 'unset',
    transportType: 'ride',
    driverId: null,
    dropoffDriverId: null,
    pickupDriverId: null,
    standingRuleId: null,
    carpoolNote: '',
  }))
}

// ─── Main export: fetch + transform in one call ───────────────
export async function getWeekCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  referenceDate: Date = new Date()
): Promise<{ events: CalendarEvent[]; weekStart: Date; weekEnd: Date }> {
  const { weekStart, weekEnd } = getWeekRange(referenceDate)

  const rawEvents = await fetchGoogleCalendarEvents(
    accessToken, calendarId, weekStart, weekEnd
  )

  const events = rawEvents
    .flatMap(raw => transformGoogleEvent(raw, weekStart))
    .sort((a, b) => a.dayIdx !== b.dayIdx
      ? a.dayIdx - b.dayIdx
      : a.sortMin - b.sortMin
    )

  return { events, weekStart, weekEnd }
}
