import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendSMS } from '@/lib/twilio'
import { sendEmail } from '@/lib/gmail'
import { getAppUrl } from '@/lib/app-url'
import { requireAdminMember } from '@/lib/auth-helpers'
import { getLatestPlanningSubmissions, getPlanningMembers, getPlanningTokensForWeek } from '@/lib/planning-data'

export async function POST(req: NextRequest) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { weekStart } = await req.json()
    if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

    const [members, submissions, tokens] = await Promise.all([
      getPlanningMembers(),
      getLatestPlanningSubmissions(weekStart),
      getPlanningTokensForWeek(weekStart),
    ])
    const submittedIds = new Set(submissions.map(s => s.memberId))
    const appUrl = getAppUrl(req)

    // Find everyone who hasn't submitted
    const notSubmitted = members.filter(m => !submittedIds.has(m.id))

    if (notSubmitted.length === 0) {
      return NextResponse.json({ success: true, message: 'Everyone has submitted!', reminded: [], notSubmitted: [] })
    }

    const reminded: string[] = []

    for (const member of notSubmitted) {
      const formType = member.type === 'child' ? 'kid' : 'adult'
      const tokenRow = tokens.find(t => t.memberId === member.id && t.formType === formType)
      const formUrl  = tokenRow ? `${appUrl}/form/${formType}/${tokenRow.token}` : appUrl

      const msg = `Hey ${member.name}! Reminder — please fill out the family weekly planner before the deadline:\n${formUrl}`

      // Try SMS first
      let sent = false
      if (member.phone && !member.phone.includes('X')) {
        sent = await sendSMS(member.phone, msg)
      }

      // Email fallback if SMS failed or no phone
      if (!sent && member.email) {
        const html = `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#1A1A2E;">Reminder: Fill out your form</h2>
            <p style="color:#4A4A5A;line-height:1.6;">Hey ${member.name}, please fill out the family weekly planner before the deadline.</p>
            <a href="${formUrl}" style="display:inline-block;background:#C4522A;color:#fff;text-decoration:none;border-radius:9px;padding:12px 24px;font-weight:700;margin:16px 0;">Fill out my form →</a>
          </div>
        `
        sent = await sendEmail(session.accessToken, {
          to: [member.email],
          subject: `Reminder: Family planning form due soon`,
          html,
        })
      }

      if (sent) reminded.push(member.name)
    }

    return NextResponse.json({
      success: true,
      reminded,
      notSubmitted: notSubmitted.map(m => m.name),
    })
  } catch (err) {
    console.error('Reminder error:', err)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
