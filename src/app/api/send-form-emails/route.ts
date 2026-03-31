import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFamilyMembers, saveTokens } from '@/lib/sheets'
import { generateWeekTokens } from '@/lib/tokens'
import { sendEmail } from '@/lib/gmail'
import { FAMILY_MEMBERS } from '@/lib/family'

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://family-planner-tawny.vercel.app'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let weekStart: string
  try {
    const body = await req.json()
    weekStart = body.weekStart
    if (!weekStart) return NextResponse.json({ error: 'Load the calendar first' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Get members — fall back to family.ts if sheet fails
  let members: any[] = []
  try {
    const sheetMembers = await getFamilyMembers(session.accessToken)
    members = sheetMembers.length > 0 ? sheetMembers : FAMILY_MEMBERS
  } catch {
    members = FAMILY_MEMBERS
  }

  if (members.length === 0) {
    return NextResponse.json({ error: 'No family members found' }, { status: 400 })
  }

  // Generate tokens and save to sheet
  const tokens = generateWeekTokens(members, weekStart)
  try {
    await saveTokens(session.accessToken, tokens.map(t => ({
      token: t.token, memberId: t.memberId, weekStart: t.weekStart, formType: t.formType,
    })))
  } catch (err) {
    console.error('Token save failed:', err)
  }

  // Send emails
  const sent: string[] = []
  const failed: string[] = []

  for (const t of tokens) {
    const member = members.find((m: any) => m.id === t.memberId)
    if (!member?.email || member.email.trim() === '') {
      failed.push(`${t.name} (no email)`)
      continue
    }

    const formUrl = `${APP_URL}/form/${t.formType}/${t.token}`
    const isKid   = t.formType === 'kid'

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:-apple-system,sans-serif;background:#F7F4EF;margin:0;padding:24px;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #E8E3DB;overflow:hidden;">
          <div style="background:#1A1A2E;padding:24px 28px;">
            <div style="font-size:11px;color:#7070A0;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Family Weekly Planning</div>
            <div style="font-size:22px;font-weight:700;color:#fff;">Hey ${t.name}! 👋</div>
          </div>
          <div style="padding:24px 28px;">
            <p style="font-size:15px;color:#4A4A5A;line-height:1.6;margin:0 0 20px;">
              ${isKid
                ? `It's time to fill out the family weekly planner. Takes about 2 minutes — let us know if you need anything this week!`
                : `The family weekly planning form is ready. Please share your schedule and driving availability so we can get organized for the week.`
              }
            </p>
            <a href="${formUrl}"
              style="display:inline-block;background:#C4522A;color:#fff;text-decoration:none;border-radius:9px;padding:14px 28px;font-size:15px;font-weight:700;font-family:-apple-system,sans-serif;">
              Fill out my form →
            </a>
            <p style="font-size:12px;color:#8B8599;margin:20px 0 0;line-height:1.5;">
              This link is just for you. If it stops working, ask for a new one.<br>
              <a href="${formUrl}" style="color:#8B8599;word-break:break-all;">${formUrl}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      const ok = await sendEmail(session.accessToken, {
        to:      [member.email],
        subject: `Family Planning — your form is ready, ${t.name}`,
        html,
      })
      if (ok) sent.push(t.name)
      else failed.push(`${t.name} (send failed)`)
    } catch {
      failed.push(`${t.name} (error)`)
    }
  }

  return NextResponse.json({ success: true, sent, failed })
}
