import { NextResponse } from 'next/server'
import { getLatestPublishedPlan } from '@/lib/planning-data'

export async function GET() {
  try {
    const latest = await getLatestPublishedPlan()
    if (!latest) {
      return NextResponse.json({ error: 'No plan found' }, { status: 404 })
    }
    return NextResponse.json(latest)
  } catch (err) {
    console.error('Plan fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 })
  }
}
