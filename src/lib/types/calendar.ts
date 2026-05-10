export type DashboardCalendarEvent = {
  id: string
  title: string
  startISO: string
  endISO: string
  allDay: boolean
  location?: string
  description?: string
  dayIdx: number
  startMinutes: number
  endMinutes: number
  category?: string
  colorOverride?: string
  // Sunday Plan metadata, merged in from AdminState
  involvedIds?: string[]
  driverId?: string | null
  transportStatus?: 'unset' | 'needs_driver' | 'no_transport' | 'assigned'
  transportType?: 'ride' | 'dropoff' | 'pickup' | 'both'
  carpoolNote?: string
  isSchoolEvent?: boolean
}

export type WeekRange = {
  weekStart: string
  weekEnd: string
  events: DashboardCalendarEvent[]
  syncedAt: string
}
