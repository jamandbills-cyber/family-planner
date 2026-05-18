export type LocalDateParts = {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  allDay: boolean
}

export type DaySpanSlice = {
  dayIdx: number
  startMinutes: number
  endMinutes: number
  allDay: boolean
  dateStr: string
}

export function julianDay(y: number, m: number, d: number) {
  return Math.floor(y * 365.25) + Math.floor((m + 1) * 30.6) + d
}

export function parseLocalParts(isoString: string): LocalDateParts {
  const tIdx = isoString.indexOf('T')
  if (tIdx === -1) {
    const [year, month, day] = isoString.split('-').map(Number)
    return { year, month: month - 1, day, hours: 0, minutes: 0, allDay: true }
  }
  const [year, month, day] = isoString.substring(0, tIdx).split('-').map(Number)
  const hours = parseInt(isoString.substring(tIdx + 1, tIdx + 3), 10)
  const minutes = parseInt(isoString.substring(tIdx + 4, tIdx + 6), 10)
  return { year, month: month - 1, day, hours, minutes, allDay: false }
}

function dateStrForJulian(j: number, anchor: LocalDateParts) {
  const date = new Date(anchor.year, anchor.month, anchor.day)
  const anchorJulian = julianDay(anchor.year, anchor.month, anchor.day)
  date.setDate(date.getDate() + (j - anchorJulian))
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Expand a calendar event into one slice per day it touches within the visible week. */
export function getDaySpanSlices(
  startParts: LocalDateParts,
  endParts: LocalDateParts,
  displayStartJulian: number,
): DaySpanSlice[] {
  const startJulian = julianDay(startParts.year, startParts.month, startParts.day)
  let endJulian = julianDay(endParts.year, endParts.month, endParts.day)

  if (startParts.allDay) {
    // Google Calendar all-day end dates are exclusive.
    endJulian -= 1
  }

  if (endJulian < startJulian) endJulian = startJulian

  const spanDays = endJulian > startJulian
  const slices: DaySpanSlice[] = []

  for (let j = startJulian; j <= endJulian; j++) {
    const dayIdx = j - displayStartJulian
    if (dayIdx < 0 || dayIdx > 6) continue

    const isFirst = j === startJulian
    const isLast = j === endJulian
    let startMinutes: number
    let endMinutes: number
    let allDay = startParts.allDay

    if (startParts.allDay) {
      startMinutes = 0
      endMinutes = 24 * 60
    } else if (!spanDays) {
      startMinutes = startParts.hours * 60 + startParts.minutes
      endMinutes = endParts.hours * 60 + endParts.minutes
      if (endMinutes <= startMinutes) endMinutes = startMinutes + 60
    } else if (isFirst) {
      startMinutes = startParts.hours * 60 + startParts.minutes
      endMinutes = 24 * 60
    } else if (isLast) {
      startMinutes = 0
      endMinutes = endParts.hours * 60 + endParts.minutes
      if (endMinutes === 0) endMinutes = 24 * 60
    } else {
      startMinutes = 0
      endMinutes = 24 * 60
      allDay = true
    }

    slices.push({
      dayIdx,
      startMinutes,
      endMinutes,
      allDay,
      dateStr: dateStrForJulian(j, startParts),
    })
  }

  return slices
}
