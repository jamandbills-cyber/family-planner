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

    // Parse payloads
    const parsed = raw.map(s => ({
      memberId:    s.memberId,
      formType:    s.formType,
      submittedAt: s.submittedAt,
      payload:     typeof s.payload === 'string' ? JSON.parse(s.payload) : s.payload,
    }))

    // Keep only the most recent submission per member
    const byMember = new Map<string, typeof parsed[0]>()
    for (const sub of parsed) {
      const existing = byMember.get(sub.memberId)
      if (!existing || sub.submittedAt > existing.submittedAt) {
        byMember.set(sub.memberId, sub)
      }
    }

    return NextResponse.json({ submissions: Array.from(byMember.values()) })
  } catch (err) {
    console.error('Submissions fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
