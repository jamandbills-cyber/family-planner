import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFamilyMembers, saveTokens } from '@/lib/sheets'
import { generateWeekTokens } from '@/lib/tokens'
import { sendBulkSMS } from '@/lib/twilio'

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

    // 1. Get family members from Google Sheets
    const members = await getFamilyMembers(session.accessToken)
    if (members.length === 0) {
      return NextResponse.json({ error: 'No family members found in sheet' }, { status: 400 })
    }

    // 2. Generate tokens for everyone
    const tokens = generateWeekTokens(members, weekStart)

    // 3. Save tokens to Google Sheets
    await saveTokens(session.accessToken, tokens.map(t => ({
      token:     t.token,
      memberId:  t.memberId,
      weekStart: t.weekStart,
      formType:  t.formType,
    })))

    // 4. Build SMS messages
    const messages = tokens
      .filter(t => {
        const member = members.find(m => m.id === t.memberId)
        return member?.phone && member.phone !== '+1XXXXXXXXXX'
      })
      .map(t => {
        const member = members.find(m => m.id === t.memberId)!
        const formUrl = `${APP_URL}/form/${t.formType}/${t.token}`

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
