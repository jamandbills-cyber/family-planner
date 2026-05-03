import { NextRequest, NextResponse } from 'next/server'
import { getSundayPlan, saveSundayPlan } from '@/lib/sunday-plan'

// Note: This route used to require a NextAuth session and write to a Google
// Sheet using the admin's OAuth access token. That made saves brittle (token
// expiration after 1 hour caused silent save failures). The /admin page is
// already gated by NextAuth at the page level, and the meeting page is the
// only other caller — both are admin-only flows. The route itself uses the
// Supabase service role, which is server-only.

// ─── GET ────────────────────────────────────────────────────
// Returns { found: true, state } when there's saved data for the week,
// { found: false } otherwise. Same response shape as the previous Sheet
// implementation so AdminSetupClient and meeting page don't need changes.
export async function GET(req: NextRequest) {
  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
  }

  try {
    const state = await getSundayPlan(weekStart)
    if (!state) return NextResponse.json({ found: false })
    return NextResponse.json({ found: true, state })
  } catch (err) {
    console.error('Load state error:', err)
    return NextResponse.json({ error: 'Failed to load state' }, { status: 500 })
  }
}

// ─── POST ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { weekStart, state } = await req.json()
    if (!weekStart || !state) {
      return NextResponse.json({ error: 'weekStart and state required' }, { status: 400 })
    }
    await saveSundayPlan(weekStart, state)
    return NextResponse.json({ saved: true, savedAt: new Date().toISOString() })
  } catch (err) {
    console.error('Save state error:', err)
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 })
  }
}
