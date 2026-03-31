import { google } from 'googleapis'
import {
  startOfWeek, endOfWeek, parseISO,
  getHours, getMinutes, format, isValid
} from 'date-fns'
import type { CalendarEvent, GoogleCalendarEvent } from './types'

// ─── Get Monday–Sunday date range for the current week ───────
export function getWeekRange(referenceDate: Date = new Date()) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }) // Monday
  const weekEnd   = endOfWeek(referenceDate,   { weekStartsOn: 1 }) // Sunday
  return { weekStart, weekEnd }
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

  const allDay = !raw.start?.dateTime
  const startDate = parseISO(startStr)
  if (!isValid(startDate)) return null

  // dayIdx: 0 = Monday, 6 = Sunday
  const msPerDay = 1000 * 60 * 60 * 24
  const dayIdx = Math.floor(
    (startDate.getTime() - weekStart.getTime()) / msPerDay
  )
  if (dayIdx < 0 || dayIdx > 6) return null

  // sortMin: minutes from midnight (0 = all day → sorts to top)
  const sortMin = allDay ? 0 : getHours(startDate) * 60 + getMinutes(startDate)

  // Human-readable time string
  let time = 'All Day'
  if (!allDay) {
    const start = format(startDate, 'h:mm a').replace(':00', '')
    if (endStr) {
      const endDate = parseISO(endStr)
      if (isValid(endDate)) {
        const end = format(endDate, 'h:mm a').replace(':00', '')
        time = `${start}–${end}`
      } else {
        time = start
      }
    } else {
      time = start
    }
  }

  return {
    id: raw.id,
    title: raw.summary ?? 'Untitled event',
    dayIdx,
    time,
    sortMin,
    location: raw.location,
    allDay,
    // These are set by the admin during setup — not from the calendar
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
