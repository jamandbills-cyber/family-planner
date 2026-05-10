import { NextResponse } from 'next/server'
import { getHouseholdDisplayData } from '@/lib/dashboard-display'

export const dynamic = 'force-dynamic'

// Public household display feed. Individual source failures are represented
// in `sources` so the signage screen can keep rendering partial data.
export async function GET() {
  const data = await getHouseholdDisplayData()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
