import { NextRequest, NextResponse } from 'next/server'
import { generateWeekTokens } from '@/lib/tokens'
import { getAppUrl } from '@/lib/app-url'
import { requireAdminMember } from '@/lib/auth-helpers'
import { getPlanningMembers, savePlanningTokens } from '@/lib/planning-data'

export async function POST(req: NextRequest) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  let weekStart: string
  try {
    const body = await req.json()
    weekStart = body.weekStart
    if (!weekStart) {
      return NextResponse.json({ error: 'Load the calendar first so the app knows which week to generate links for' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const members = await getPlanningMembers()

  const appUrl = getAppUrl(req)

  if (members.length === 0) {
    return NextResponse.json({ error: 'No family members found. Add family members in Manage > Roster.' }, { status: 400 })
  }

  // Generate tokens
  const tokens = generateWeekTokens(members, weekStart)

  // Save tokens to Supabase so tokenized forms can validate them.
  try {
    await savePlanningTokens(tokens.map(t => ({
      token:     t.token,
      memberId:  t.memberId,
      weekStart: t.weekStart,
      formType:  t.formType,
    })))
  } catch (err) {
    console.error('Token save failed:', err)
    return NextResponse.json({
      error: 'Links could not be saved. Try again before sharing form links.',
    }, { status: 500 })
  }

  const links = tokens.map(t => ({
    name:  t.name,
    type:  t.formType,
    url:   `${appUrl}/form/${t.formType}/${t.token}`,
    token: t.token,
  }))

  return NextResponse.json({
    links,
    sharedUrl: `${appUrl}/form/week/${weekStart}`,
  })
}
