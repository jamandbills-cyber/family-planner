import { NextRequest, NextResponse } from 'next/server'
import { getPlanningMembers, getPlanningTokensForWeek } from '@/lib/planning-data'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weekStart: string }> }
) {
  const { weekStart } = await params

  try {
    const [members, tokens] = await Promise.all([
      getPlanningMembers(),
      getPlanningTokensForWeek(weekStart),
    ])

    const tokenByMember = new Map(tokens.map(t => [t.memberId, t]))
    const people = members
      .map(member => {
        const token = tokenByMember.get(member.id)
        if (!token) return null
        return {
          id: member.id,
          name: member.name,
          type: member.type,
          color: member.color,
          url: `/form/${token.formType}/${token.token}`,
          submitted: !!token.usedAt,
        }
      })
      .filter((person): person is NonNullable<typeof person> => !!person)

    return NextResponse.json({ weekStart, people })
  } catch (err) {
    console.error('Shared form week error:', err)
    return NextResponse.json({ error: 'Failed to load planning links' }, { status: 500 })
  }
}
