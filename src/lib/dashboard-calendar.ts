import 'server-only'

import { google } from 'googleapis'
import { addDays, addWeeks, format, startOfWeek } from 'date-fns'
import type { DashboardCalendarEvent, WeekRange } from '@/lib/types/calendar'
import { getDaySpanSlices, julianDay, parseLocalParts } from '@/lib/calendar-day-span'
import { getSundayPlan } from '@/lib/sunday-plan'

const HOUSEHOLD_TIME_ZONE = process.env.HOUSEHOLD_TIME_ZONE ?? 'America/Denver'

function getHouseholdToday(timeZone: string = HOUSEHOLD_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = Number(parts.find(p => p.type === 'year')?.value)
  const month = Number(parts.find(p => p.type === 'month')?.value)
  const day = Number(parts.find(p => p.type === 'day')?.value)

  return new Date(year, month - 1, day)
}

function getGoogleCalendarAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
}

function parseTimeStr(timeStr: string): number {
  if (!timeStr) return 0
  const m = timeStr.trim().match(/^(\d{1,2}):?(\d{0,2})\s*(AM|PM)?$/i)
  if (!m) return 0
  let hours = parseInt(m[1], 10)
  const minutes = m[2] ? parseInt(m[2], 10) : 0
  const period = (m[3] ?? '').toUpperCase()
  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

function savedEventToDashboard(
  saved: any,
  planWeekStartDate: Date,
  displayStartDate: Date
): DashboardCalendarEvent | null {
  if (saved.dayIdx === undefined || saved.dayIdx < 0 || saved.dayIdx > 6) return null

  const eventDate = new Date(planWeekStartDate)
  eventDate.setDate(eventDate.getDate() + saved.dayIdx)
  const displayDayIdx = Math.floor(
    (new Date(eventDate.toDateString()).getTime() - new Date(displayStartDate.toDateString()).getTime()) / 86400000
  )
  if (displayDayIdx < 0 || displayDayIdx > 6) return null

  const dateStr = eventDate.toISOString().slice(0, 10)

  let startMinutes = 0
  let endMinutes = 60
  const isSchool = typeof saved.id === 'string' && saved.id.startsWith('school_')

  if (saved.allDay) {
    startMinutes = 0
    endMinutes = 24 * 60
  } else if (saved.time) {
    const range = saved.time.match(/^(.+?)[–\-](.+)$/)
    if (range) {
      let startStr = range[1].trim()
      const endStr = range[2].trim()
      const endPeriod = (endStr.match(/(AM|PM)/i) ?? [])[1]
      if (endPeriod && !/AM|PM/i.test(startStr)) startStr = `${startStr} ${endPeriod}`
      startMinutes = parseTimeStr(startStr)
      endMinutes = parseTimeStr(endStr)
    } else {
      startMinutes = parseTimeStr(saved.time)
      endMinutes = startMinutes + (isSchool ? 30 : 60)
    }
  } else {
    startMinutes = 0
    endMinutes = 24 * 60
  }

  return {
    id: saved.id ?? `synth-${displayDayIdx}-${saved.title}`,
    title: saved.title ?? '(untitled)',
    startISO: `${dateStr}T${String(Math.floor(startMinutes/60)).padStart(2,'0')}:${String(startMinutes%60).padStart(2,'0')}:00`,
    endISO:   `${dateStr}T${String(Math.floor(endMinutes/60)).padStart(2,'0')}:${String(endMinutes%60).padStart(2,'0')}:00`,
    allDay: !!saved.allDay,
    location: saved.location ?? undefined,
    dayIdx: displayDayIdx,
    startMinutes,
    endMinutes,
    involvedIds: saved.involvedIds ?? [],
    driverId: saved.driverId ?? null,
    dropoffDriverId: saved.dropoffDriverId ?? null,
    pickupDriverId: saved.pickupDriverId ?? null,
    transportStatus: saved.transportStatus ?? 'unset',
    transportType: saved.transportType ?? 'ride',
    carpoolNote: saved.carpoolNote ?? '',
    isSchoolEvent: isSchool,
  }
}

function isSchoolish(title: string, id?: string) {
  if (id?.startsWith('school_')) return true
  const lower = title.toLowerCase()
  return lower.includes('school drop') || lower.includes('school pick')
}

export async function fetchWeekCalendar(weekOffset: number = 0): Promise<WeekRange> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
  const displayStart = addWeeks(getHouseholdToday(), weekOffset)
  const displayEnd = addDays(displayStart, 6)
  const displayMax = addDays(displayStart, 8)
  const displayStartStr = format(displayStart, 'yyyy-MM-dd')

  const auth = getGoogleCalendarAuth()
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.list({
    calendarId,
    timeMin: displayStart.toISOString(),
    timeMax: displayMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  })

  const displayStartParts = {
    year: displayStart.getFullYear(),
    month: displayStart.getMonth(),
    day: displayStart.getDate(),
  }
  const displayStartJulian = julianDay(
    displayStartParts.year,
    displayStartParts.month,
    displayStartParts.day
  )

  // Sunday-plan state is saved by Sunday-start week. A rolling 7-day display
  // may cross a Sunday boundary, so merge state from both touched weeks.
  const firstPlanWeekStart = startOfWeek(displayStart, { weekStartsOn: 0 })
  const secondPlanWeekStart = startOfWeek(displayEnd, { weekStartsOn: 0 })
  const planWeekStarts = [firstPlanWeekStart]
  if (format(secondPlanWeekStart, 'yyyy-MM-dd') !== format(firstPlanWeekStart, 'yyyy-MM-dd')) {
    planWeekStarts.push(secondPlanWeekStart)
  }

  const planStates = await Promise.all(
    planWeekStarts.map(async planWeekStart => ({
      planWeekStart,
      state: await getSundayPlan(format(planWeekStart, 'yyyy-MM-dd')),
    }))
  )

  const savedEvents: any[] = planStates.flatMap(({ planWeekStart, state }) =>
    (state?.events ?? []).map((event: any) => {
      const eventDate = addDays(planWeekStart, event.dayIdx ?? 0)
      const displayDayIdx = Math.floor(
        (new Date(eventDate.toDateString()).getTime() - new Date(displayStart.toDateString()).getTime()) / 86400000
      )
      return { ...event, displayDayIdx, planWeekStart }
    }).filter((event: any) => event.displayDayIdx >= 0 && event.displayDayIdx <= 6)
  )

  const calendarEvents: DashboardCalendarEvent[] = (response.data.items ?? [])
    .flatMap(raw => {
      const startStr = raw.start?.dateTime ?? raw.start?.date
      const endStr   = raw.end?.dateTime   ?? raw.end?.date
      if (!startStr || !raw.id) return []
      if (isSchoolish(raw.summary ?? '', raw.id)) return []

      const startParts = parseLocalParts(startStr)
      const endParts   = endStr ? parseLocalParts(endStr) : startParts
      const slices = getDaySpanSlices(startParts, endParts, displayStartJulian)
      if (slices.length === 0) return []

      const spanDays = slices.length > 1
      const saved = savedEvents.find((s: any) => s.id === raw.id)
        ?? savedEvents.find((s: any) => s.title === raw.summary)

      return slices.map(slice => {
        const evt: DashboardCalendarEvent = {
          id: spanDays ? `${raw.id}#${slice.dayIdx}` : raw.id!,
          title: raw.summary ?? '(untitled)',
          startISO: slice.allDay
            ? `${slice.dateStr}T00:00:00`
            : startStr,
          endISO: slice.allDay
            ? `${slice.dateStr}T23:59:59`
            : (endStr ?? startStr),
          allDay: slice.allDay,
          location: raw.location ?? undefined,
          description: raw.description ?? undefined,
          dayIdx: slice.dayIdx,
          startMinutes: slice.startMinutes,
          endMinutes: slice.endMinutes,
          involvedIds: [],
          driverId: null,
          dropoffDriverId: null,
          pickupDriverId: null,
          transportStatus: 'unset',
          transportType: 'ride',
          isSchoolEvent: false,
        }

        if (
          saved &&
          (saved.displayDayIdx === undefined || saved.displayDayIdx === slice.dayIdx)
        ) {
          evt.involvedIds = saved.involvedIds ?? []
          evt.driverId = saved.driverId ?? null
          evt.dropoffDriverId = saved.dropoffDriverId ?? null
          evt.pickupDriverId = saved.pickupDriverId ?? null
          evt.transportStatus = saved.transportStatus ?? 'unset'
          evt.transportType = saved.transportType ?? 'ride'
          evt.carpoolNote = saved.carpoolNote ?? ''
        }

        return evt
      })
    })

  const schoolEvents: DashboardCalendarEvent[] = savedEvents
    .filter((s: any) => typeof s.id === 'string' && s.id.startsWith('school_'))
    .map(s => savedEventToDashboard(s, s.planWeekStart, displayStart))
    .filter((e): e is DashboardCalendarEvent => e !== null)

  const all = [...calendarEvents, ...schoolEvents]
    .sort((a, b) => a.dayIdx !== b.dayIdx ? a.dayIdx - b.dayIdx : a.startMinutes - b.startMinutes)

  return {
    weekStart: displayStartStr,
    weekEnd:   format(displayEnd, 'yyyy-MM-dd'),
    events: all,
    syncedAt: new Date().toISOString(),
  }
}
