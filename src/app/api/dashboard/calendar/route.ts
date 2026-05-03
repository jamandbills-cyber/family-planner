import { NextRequest, NextResponse } from 'next/server'
import { fetchWeekCalendar } from '@/lib/dashboard-calendar'

// Public endpoint — no auth required.
// Used by both the logged-in /dashboard and the device-token /d/[token] pages
// for client-side polling to keep the calendar fresh.
//
// We rely on the calendar being shared only with the service account
// (so visibility is controlled at the Google side, not by per-user auth here).
export async function GET(req: NextRequest) {
  const offsetParam = req.nextUrl.searchParams.get('weekOffset')
  const weekOffset  = Math.min(Math.max(parseInt(offsetParam ?? '0', 10) || 0, 0), 8)

  try {
    const data = await fetchWeekCalendar(weekOffset)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err: any) {
    console.error('Dashboard calendar fetch error:', err?.message ?? err)
    return NextResponse.json(
      { error: 'Failed to fetch calendar', detail: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
