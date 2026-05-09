import { NextRequest, NextResponse } from 'next/server'
import { generateWeekTokens } from '@/lib/tokens'
import { sendBulkSMS } from '@/lib/twilio'
import { requireAdminMember } from '@/lib/auth-helpers'
import { isValidInternalRequest } from '@/lib/internal-auth'
import { getAppUrl } from '@/lib/app-url'
import { getPlanningMembers, savePlanningTokens } from '@/lib/planning-data'

export async function POST(req: NextRequest) {
  const isInternal = isValidInternalRequest(req)
  if (!isInternal) {
    const auth = await requireAdminMember()
    if (auth.response) return auth.response
  }

  try {
    const { weekStart } = await req.json()
    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
    }

    // 1. Get family members from Supabase
    const members = await getPlanningMembers()
    if (members.length === 0) {
      return NextResponse.json({ error: 'No family members found' }, { status: 400 })
    }

    // 2. Generate tokens for everyone
    const tokens = generateWeekTokens(members, weekStart)

    // 3. Save tokens to Supabase
    const tokenRows = tokens.map(t => ({
      token:     t.token,
      memberId:  t.memberId,
      weekStart: t.weekStart,
      formType:  t.formType,
    }))
    await savePlanningTokens(tokenRows)

    // 4. Build SMS messages
    const messages = tokens
      .filter(t => {
        const member = members.find(m => m.id === t.memberId)
        return member?.phone && member.phone !== '+1XXXXXXXXXX'
      })
      .map(t => {
        const member = members.find(m => m.id === t.memberId)!
        const formUrl = `${getAppUrl(req)}/form/${t.formType}/${t.token}`

        const body = t.formType === 'kid'
          ? `Hey ${member.name}! 👋 Time to fill out the family weekly planner. Takes 2 minutes:\n${formUrl}`
          : `Hey ${member.name}, the family weekly planning form is ready. Please share your schedule and driving availability:\n${formUrl}`

        return { to: member.phone, body, name: member.name }
      })

    // 5. Send texts
    const results = await sendBulkSMS(messages)

    const sent   = results.filter(r => r.success).map(r => r.name)
    const failed = results.filter(r => !r.success).map(r => r.name)

    return NextResponse.json({
      success: true,
      sent,
      failed,
      tokenCount: tokens.length,
    })
  } catch (err) {
    console.error('Send forms error:', err)
    return NextResponse.json({ error: 'Failed to send forms' }, { status: 500 })
  }
}
