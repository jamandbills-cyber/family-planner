import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFamilyMembers, saveTokens } from '@/lib/sheets'
import { generateWeekTokens } from '@/lib/tokens'
import { FAMILY_MEMBERS } from '@/lib/family'

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://family-planner-tawny.vercel.app'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not signed in — please sign out and sign back in' }, { status: 401 })
  }

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

  // Try to get members from sheet, fall back to family.ts
  let members: any[] = []
  try {
    const sheetMembers = await getFamilyMembers(session.accessToken)
    members = sheetMembers.length > 0 ? sheetMembers : FAMILY_MEMBERS
  } catch (err) {
    console.warn('Sheet read failed, using family.ts fallback:', err)
    members = FAMILY_MEMBERS
  }

  if (members.length === 0) {
    return NextResponse.json({ error: 'No family members found. Check your Google Sheet has a "Family" tab with data.' }, { status: 400 })
  }

  // Generate tokens
  const tokens = generateWeekTokens(members, weekStart)

  // Try to save tokens — if this fails, links still work via family.ts fallback
  try {
    await saveTokens(session.accessToken, tokens.map(t => ({
      token:     t.token,
      memberId:  t.memberId,
      weekStart: t.weekStart,
      formType:  t.formType,
    })))
  } catch (err) {
    console.error('Token save failed:', err)
    // Don't fail the whole request — return links anyway
    // Forms will need the token in the sheet to work, so warn about it
    const links = tokens.map(t => ({
      name:    t.name,
      type:    t.formType,
      url:     `${APP_URL}/form/${t.formType}/${t.token}`,
      token:   t.token,
    }))
    return NextResponse.json({
      links,
      warning: 'Links generated but could not be saved to Google Sheets. Make sure your sheet has a "Tokens" tab with columns: token, memberId, weekStart, formType, usedAt'
    })
  }

  const links = tokens.map(t => ({
    name:  t.name,
    type:  t.formType,
    url:   `${APP_URL}/form/${t.formType}/${t.token}`,
    token: t.token,
  }))

  return NextResponse.json({ links })
}
