import type { FamilyMember } from './types'

// ─────────────────────────────────────────────────────────────
// UPDATE THIS FILE with your real family members.
// phones must be E.164 format: +18015551234
// ─────────────────────────────────────────────────────────────

export const FAMILY_MEMBERS: FamilyMember[] = [
  // Adults
  { id: 'steve', name: 'Steve',  type: 'adult', phone: '+1XXXXXXXXXX', color: '#1D4ED8' },
  { id: 'mom',   name: 'Mom',    type: 'adult', phone: '+1XXXXXXXXXX', color: '#7C3AED' },
  { id: 'dad',   name: 'Dad',    type: 'adult', phone: '+1XXXXXXXXXX', color: '#047857' },
  { id: 'chris', name: 'Chris',  type: 'adult', phone: '+1XXXXXXXXXX', color: '#B45309' },
  // Kids
  { id: 'boston', name: 'Boston', type: 'child', phone: '+1XXXXXXXXXX', color: '#DC2626' },
  { id: 'justin', name: 'Justin', type: 'child', phone: '+1XXXXXXXXXX', color: '#0891B2' },
  { id: 'sadie',  name: 'Sadie',  type: 'child', phone: '+1XXXXXXXXXX', color: '#DB2777' },
  { id: 'hailee', name: 'Hailee', type: 'child', phone: '+1XXXXXXXXXX', color: '#65A30D' },
]

export const ADULTS = FAMILY_MEMBERS.filter(m => m.type === 'adult')
export const KIDS   = FAMILY_MEMBERS.filter(m => m.type === 'child')

export const getMember = (id: string) => FAMILY_MEMBERS.find(m => m.id === id)
