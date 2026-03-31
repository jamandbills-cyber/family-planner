// ─── Family members ───────────────────────────────────────────
export interface FamilyMember {
  id: string
  name: string
  type: 'adult' | 'child'
  phone: string
  color: string
}

// ─── Calendar events ──────────────────────────────────────────
export type TransportStatus = 'unset' | 'needs_driver' | 'no_transport'

export interface CalendarEvent {
  id: string
  title: string
  dayIdx: number          // 0 = Monday … 6 = Sunday
  time: string            // display string e.g. "4:00–6:00 PM"
  sortMin: number         // minutes from midnight for ordering (0 = all day)
  location?: string
  allDay: boolean
  involvedIds: string[]   // family member IDs — set by admin
  transportStatus: TransportStatus
  driverId?: string | null
  standingRuleId?: string | null
  carpoolNote?: string
}

// ─── Standing rules ───────────────────────────────────────────
export interface StandingRule {
  id: string
  label: string
  driverId: string
  passengerId: string
  recurrence: string
  overrideThisWeek: boolean
}

// ─── Dinner plan ──────────────────────────────────────────────
export interface DinnerEntry {
  dayIdx: number
  meal: string
  cook: string
}

// ─── Admin setup state (saved to Google Sheets / DB) ──────────
export interface AdminSetupData {
  weekStart: string           // ISO date string "YYYY-MM-DD" (Monday)
  events: CalendarEvent[]
  standingRules: StandingRule[]
  dinnerGrid: DinnerEntry[]
  agendaItems: string[]
  deadline: string            // "17:00"
  deadlineDay: 'saturday' | 'sunday'
  isReady: boolean
  readySetAt?: string
  lastSynced?: string
  formsSentAt?: string
}

// ─── Form submissions ─────────────────────────────────────────
export interface OffCalendarEvent {
  what: string
  day: string
  time: string
  where: string
  needsRide: boolean | null
}

export interface ShoppingItem {
  item: string
  qty: string
  why: string
}

export interface KidSubmission {
  memberId: string
  submittedAt: string
  offCalendarEvents: OffCalendarEvent[]
  shoppingItems: ShoppingItem[]
  meetingTopics: string[]
  allGood: boolean
}

export interface AdultSubmission {
  memberId: string
  submittedAt: string
  drivingResponses: Record<string, boolean | null>  // eventId → can drive
  unavailableDays: string[]
  offCalendarEvents: OffCalendarEvent[]
  meetingTopics: string[]
}

// ─── Raw Google Calendar event (from API) ─────────────────────
export interface GoogleCalendarEvent {
  id: string
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  location?: string
}
