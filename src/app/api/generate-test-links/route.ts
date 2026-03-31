import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFamilyMembers, saveTokens } from '@/lib/sheets'
import { generateWeekTokens } from '@/lib/tokens'

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://family-planner-tawny.vercel.app'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { weekStart } = await req.json()
    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
    }

    const members = await getFamilyMembers(session.accessToken)
    if (members.length === 0) {
      return NextResponse.json({ error: 'No family members found in sheet' }, { status: 400 })
    }

    const tokens = generateWeekTokens(members, weekStart)

    // Save tokens to Sheets so the forms work when visited
    await saveTokens(session.accessToken, tokens.map(t => ({
      token:     t.token,
      memberId:  t.memberId,
      weekStart: t.weekStart,
      formType:  t.formType,
    })))

    // Return links for each person
    const links = tokens.map(t => ({
      name:    t.name,
      type:    t.formType,
      url:     `${APP_URL}/form/${t.formType}/${t.token}`,
      token:   t.token,
    }))

    return NextResponse.json({ links })
  } catch (err) {
    console.error('Generate test links error:', err)
    return NextResponse.json({ error: 'Failed to generate links' }, { status: 500 })
  }
}
