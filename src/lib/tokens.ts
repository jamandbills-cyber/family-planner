import { randomBytes } from 'crypto'

// ─── Generate a unique form token ────────────────────────────
// Format: {memberId}-{weekStart}-{randomHex}
// e.g. boston-2026-03-29-a3f8c2d1
export function generateToken(memberId: string, weekStart: string): string {
  const random = randomBytes(6).toString('hex')
  return `${memberId}-${weekStart}-${random}`
}

// ─── Generate tokens for all family members ───────────────────
export function generateWeekTokens(
  members: Array<{ id: string; name: string; type: 'adult' | 'child' }>,
  weekStart: string
) {
  return members.map(m => ({
    token:     generateToken(m.id, weekStart),
    memberId:  m.id,
    name:      m.name,
    type:      m.type,
    weekStart,
    formType:  m.type === 'child' ? 'kid' as const : 'adult' as const,
  }))
}
