import { NextResponse } from 'next/server'
import { getKitchenColumns } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

// Public endpoint for legacy/diagnostic column data.
// The current kitchen display uses /api/dashboard/display for the full payload.
// Returns family columns (per-member tasks/ideas) and the members list.
// No auth — same trust model as /api/dashboard/calendar.
export async function GET() {
  const data = await getKitchenColumns()
  if (!data) {
    return NextResponse.json({ columns: [], members: [], syncedAt: new Date().toISOString() })
  }

  return NextResponse.json({
    ...data,
    syncedAt: new Date().toISOString(),
  })
}
