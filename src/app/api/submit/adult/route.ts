import { NextRequest, NextResponse } from 'next/server'
import { savePlanningSubmission } from '@/lib/planning-data'

export async function POST(req: NextRequest) {
  try {
    const { token, payload } = await req.json()
    if (!token || !payload) {
      return NextResponse.json({ error: 'Missing token or payload' }, { status: 400 })
    }

    const saved = await savePlanningSubmission(token, 'adult', payload)
    if (!saved) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Adult submit error:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
