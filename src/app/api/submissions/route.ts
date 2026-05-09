import { NextRequest, NextResponse } from 'next/server'
import { getLatestPlanningSubmissions } from '@/lib/planning-data'

export async function GET(req: NextRequest) {
  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
  }

  try {
    const submissions = await getLatestPlanningSubmissions(weekStart)
    return NextResponse.json({ submissions })
  } catch (err) {
    console.error('Submissions fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
