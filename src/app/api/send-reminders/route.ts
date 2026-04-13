import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'
import { sendSMS } from '@/lib/twilio'
import { sendEmail } from '@/lib/gmail'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!
const APP_URL   = process.env.NEXTAUTH_URL ?? 'https://family-planner-tawny.vercel.app'

function getServiceClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set')
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { weekStart } = await req.json()
    if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

    const sheets = getServiceClient()

    // Get family members
    const famRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID, range: 'Family!A2:G100',
    })
    const members = (famRes.data.values ?? []).filter(r => r[0]).map(r => ({
      id: r[0], name: r[1], type: r[2], phone: r[3], email: r[4], color: r[5],
    }))

    // Get submissions
    const subRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID, range: 'Submissions!A2:E1000',
    })
    const submittedIds = new Set(
      (subRes.data.values ?? [])
        .filter(r => r[3] === weekStart)
        .map(r => r[1])
    )

    // Get tokens for form links
    const tokenRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID, range: 'Tokens!A2:E500',
    })
    const tokenRows = (tokenRes.data.values ?? []) as string[][]

    // Find everyone who hasn't submitted
    const notSubmitted = members.filter(m => !submittedIds.has(m.id))

    if (notSubmitted.length === 0) {
      return NextResponse.json({ success: true, message: 'Everyone has submitted!', reminded: [], notSubmitted: [] })
    }

    const reminded: string[] = []

    for (const member of notSubmitted) {
      const formType = member.type === 'child' ? 'kid' : 'adult'
      const tokenRow = tokenRows.find(r => r[1] === member.id && r[2] === weekStart && r[3] === formType)
      const formUrl  = tokenRow ? `${APP_URL}/form/${formType}/${tokenRow[0]}` : APP_URL

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
