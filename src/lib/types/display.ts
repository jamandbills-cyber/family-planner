import type { WeekRange } from './calendar'

export type DisplayOrientation = 'landscape' | 'portrait'

export type DisplayMember = {
  id: string
  display_name: string
  color: string | null
  type: 'adult' | 'child'
}

export type DisplayMemberColor = {
  id: string
  display_name: string
  color: string | null
}

export type DisplayTask = {
  id: string
  text: string
  due_date: string | null
  project: { name: string; color: string | null } | null
}

export type DisplayIdea = {
  id: string
  text: string
}

export type DisplayColumn = {
  member: DisplayMember
  tasks: DisplayTask[]
  ideas: DisplayIdea[]
}

export type DisplayDinnerSlot = {
  dayIdx: number
  meal: string
  cook: string
}

export type DisplaySourceStatus = {
  ok: boolean
  syncedAt: string
  staleAfterMs: number
  error?: string
}

export type HouseholdDisplayData = {
  calendar: WeekRange | null
  columns: DisplayColumn[]
  members: DisplayMemberColor[]
  dinner: DisplayDinnerSlot[]
  photos: string[]
  sources: {
    calendar: DisplaySourceStatus
    columns: DisplaySourceStatus
    dinner: DisplaySourceStatus
    photos: DisplaySourceStatus
  }
  syncedAt: string
}
