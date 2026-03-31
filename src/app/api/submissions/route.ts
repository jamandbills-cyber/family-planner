import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSubmissions } from '@/lib/sheets'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
  }

  try {
    const raw = await getSubmissions(session.accessToken, weekStart)
    // Parse the payload JSON for each submission
    const submissions = raw.map(s => ({
      memberId:    s.memberId,
      formType:    s.formType,
      submittedAt: s.submittedAt,
      payload:     typeof s.payload === 'string' ? JSON.parse(s.payload) : s.payload,
    }))
    return NextResponse.json({ submissions })
  } catch (err) {
    console.error('Submissions fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
