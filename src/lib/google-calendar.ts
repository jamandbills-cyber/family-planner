import { google } from 'googleapis'
import { startOfWeek, endOfWeek, isValid } from 'date-fns'
import type { CalendarEvent, GoogleCalendarEvent } from './types'

// ─── Week starts on Sunday (0), ends on Saturday ─────────────
export function getWeekRange(referenceDate: Date = new Date()) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 }) // Sunday
  const weekEnd   = endOfWeek(referenceDate,   { weekStartsOn: 0 }) // Saturday
  return { weekStart, weekEnd }
}

// ─── Parse time parts directly from ISO string ────────────────
// This avoids UTC conversion issues on the server.
// Google Calendar stores times with their local offset,
// e.g. "2026-03-30T08:00:00-06:00" — we read "8:00" directly.
function parseLocalParts(isoString: string) {
  const tIdx = isoString.indexOf('T')
  if (tIdx === -1) {
    // All-day: "2026-03-30"
    const [year, month, day] = isoString.split('-').map(Number)
    return { year, month: month - 1, day, hours: 0, minutes: 0, allDay: true }
  }
  const [year, month, day] = isoString.substring(0, tIdx).split('-').map(Number)
  const hours   = parseInt(isoString.substring(tIdx + 1, tIdx + 3), 10)
  const minutes = parseInt(isoString.substring(tIdx + 4, tIdx + 6), 10)
  return { year, month: month - 1, day, hours, minutes, allDay: false }
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

// ─── Convert a Google Calendar event to our CalendarEvent ────
export function transformGoogleEvent(
  raw: GoogleCalendarEvent,
  weekStart: Date
): CalendarEvent | null {
  const startStr = raw.start?.dateTime ?? raw.start?.date
  const endStr   = raw.end?.dateTime   ?? raw.end?.date
  if (!startStr) return null

  const startParts = parseLocalParts(startStr)

  // Build a local midnight date for day comparison
  // weekStart is UTC midnight of Sunday — extract just its date parts
  const wsYear  = weekStart.getUTCFullYear()
  const wsMonth = weekStart.getUTCMonth()
  const wsDay   = weekStart.getUTCDate()

  // Build comparable numbers: days since some epoch using local date parts
  const toJulian = (y: number, m: number, d: number) =>
    Math.floor(y * 365.25) + Math.floor((m + 1) * 30.6) + d

  const startJulian = toJulian(startParts.year, startParts.month, startParts.day)
  const wsJulian    = toJulian(wsYear, wsMonth, wsDay)
  const dayIdx      = startJulian - wsJulian

  if (dayIdx < 0 || dayIdx > 6) return null

  // sortMin for chronological ordering (0 = all day → top)
  const sortMin = startParts.allDay ? 0 : startParts.hours * 60 + startParts.minutes

  // Human-readable time string
  let time = 'All Day'
  if (!startParts.allDay) {
    const startStr2 = formatLocalTime(startParts.hours, startParts.minutes)
    if (endStr) {
      const endParts = parseLocalParts(endStr)
      if (!endParts.allDay) {
        const endStr2 = formatLocalTime(endParts.hours, endParts.minutes)
        time = `${startStr2}–${endStr2}`
      } else {
        time = startStr2
      }
    } else {
      time = startStr2
    }
  }

  return {
    id: raw.id,
    title: raw.summary ?? 'Untitled event',
    dayIdx,
    time,
    sortMin,
    location: raw.location,
    allDay: startParts.allDay,
    involvedIds: [],
    transportStatus: 'unset',
    driverId: null,
    standingRuleId: null,
    carpoolNote: '',
  }
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
    .map(raw => transformGoogleEvent(raw, weekStart))
    .filter((e): e is CalendarEvent => e !== null)
    .sort((a, b) => a.dayIdx !== b.dayIdx
      ? a.dayIdx - b.dayIdx
      : a.sortMin - b.sortMin
    )

  return { events, weekStart, weekEnd }
}
