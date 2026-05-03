import 'server-only'

import { google } from 'googleapis'
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns'
import type { DashboardCalendarEvent, WeekRange } from '@/lib/types/calendar'

// Reuses the existing GOOGLE_SERVICE_ACCOUNT_KEY env var (already set up for Sheets).
// The calendar must be shared with the service account email for this to work.
function getCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
  return google.calendar({ version: 'v3', auth })
}

// Parse an ISO timestamp keeping local-time meaning (avoids UTC drift).
// Google Calendar returns "2026-05-04T14:00:00-06:00" — we want 14:00 local.
function parseLocalParts(isoString: string) {
  const tIdx = isoString.indexOf('T')
  if (tIdx === -1) {
    const [year, month, day] = isoString.split('-').map(Number)
    return { year, month: month - 1, day, hours: 0, minutes: 0, allDay: true }
  }
  const [year, month, day] = isoString.substring(0, tIdx).split('-').map(Number)
  const hours   = parseInt(isoString.substring(tIdx + 1, tIdx + 3), 10)
  const minutes = parseInt(isoString.substring(tIdx + 4, tIdx + 6), 10)
  return { year, month: month - 1, day, hours, minutes, allDay: false }
}

function julianDay(y: number, m: number, d: number) {
  // Crude Julian day used for "days between" math without timezone risk
  return Math.floor(y * 365.25) + Math.floor((m + 1) * 30.6) + d
}

export async function fetchWeekCalendar(weekOffset: number = 0): Promise<WeekRange> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
  const referenceDate = addWeeks(new Date(), weekOffset)
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 }) // Sunday
  const weekEnd   = endOfWeek(referenceDate,   { weekStartsOn: 0 }) // Saturday

  const calendar = getCalendarClient()

  const response = await calendar.events.list({
    calendarId,
    timeMin: weekStart.toISOString(),
    timeMax: weekEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  })

  const wsParts = {
    year: weekStart.getFullYear(),
    month: weekStart.getMonth(),
    day: weekStart.getDate(),
  }
  const wsJulian = julianDay(wsParts.year, wsParts.month, wsParts.day)

  const events: DashboardCalendarEvent[] = (response.data.items ?? [])
    .map(raw => {
      const startStr = raw.start?.dateTime ?? raw.start?.date
      const endStr   = raw.end?.dateTime   ?? raw.end?.date
      if (!startStr || !raw.id) return null

      const startParts = parseLocalParts(startStr)
      const endParts   = endStr ? parseLocalParts(endStr) : startParts

      const startJulian = julianDay(startParts.year, startParts.month, startParts.day)
      const dayIdx = startJulian - wsJulian
      if (dayIdx < 0 || dayIdx > 6) return null

      const startMinutes = startParts.allDay ? 0 : startParts.hours * 60 + startParts.minutes
      // For multi-day or events that end the next day, cap at end of day for now
      const sameDay = startParts.year === endParts.year &&
                      startParts.month === endParts.month &&
                      startParts.day === endParts.day
      const endMinutes = startParts.allDay
        ? 24 * 60
        : sameDay
          ? endParts.hours * 60 + endParts.minutes
          : 24 * 60

      return {
        id: raw.id,
        title: raw.summary ?? '(untitled)',
        startISO: startStr,
        endISO: endStr ?? startStr,
        allDay: startParts.allDay,
        location: raw.location ?? undefined,
        description: raw.description ?? undefined,
        dayIdx,
        startMinutes,
        endMinutes,
      } as DashboardCalendarEvent
    })
    .filter((e): e is DashboardCalendarEvent => e !== null)
    .sort((a, b) => a.dayIdx !== b.dayIdx
      ? a.dayIdx - b.dayIdx
      : a.startMinutes - b.startMinutes
    )

  return {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd:   format(weekEnd,   'yyyy-MM-dd'),
    events,
    syncedAt: new Date().toISOString(),
  }
}
