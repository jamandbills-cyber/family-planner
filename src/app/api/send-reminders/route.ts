import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFamilyMembers, getSubmissions, getToken } from '@/lib/sheets'
import { google } from 'googleapis'
import { sendSMS } from '@/lib/twilio'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!
const APP_URL   = process.env.NEXTAUTH_URL ?? 'https://family-planner-tawny.vercel.app'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())

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

    // 1. Get all family members
    const members = await getFamilyMembers(session.accessToken)
    const kids    = members.filter(m => m.type === 'child')

    // 2. Get who has already submitted this week
    const submissions  = await getSubmissions(session.accessToken, weekStart)
    const submittedIds = submissions.map(s => s.memberId)

    // 3. Find kids who haven't submitted
    const notSubmitted = kids.filter(k => !submittedIds.includes(k.id))

    if (notSubmitted.length === 0) {
      return NextResponse.json({ success: true, message: 'Everyone has submitted!' })
    }

    // 4. Get their tokens so we can include the form link
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken })
    const sheets = google.sheets({ version: 'v4', auth })

    const tokenRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Tokens!A2:E500',
    })
    const tokenRows = (tokenRes.data.values ?? []) as string[][]

    // 5. Send reminder to each kid who hasn't submitted
    const reminded: string[] = []
    for (const kid of notSubmitted) {
      if (!kid.phone || kid.phone === '+1XXXXXXXXXX') continue

      // Find their token for this week
      const tokenRow = tokenRows.find(r => r[1] === kid.id && r[2] === weekStart && r[3] === 'kid')
      const formUrl  = tokenRow
        ? `${APP_URL}/form/kid/${tokenRow[0]}`
        : `${APP_URL}`

      const sent = await sendSMS(
        kid.phone,
        `Hey ${kid.name}! Reminder — please fill out the family weekly planner before tonight's deadline:\n${formUrl}`
      )

      if (sent) reminded.push(kid.name)
    }

    // 6. Notify the admin
    const adminNames = notSubmitted.map(k => k.name).join(', ')
    const adminPhone = members.find(m =>
      m.type === 'adult' && ADMIN_EMAILS.some(e => e === m.email)
    )?.phone

    if (adminPhone && adminPhone !== '+1XXXXXXXXXX') {
      await sendSMS(
        adminPhone,
        `Family Planner: ${adminNames} ${notSubmitted.length === 1 ? 'has' : 'have'} not submitted their weekly form yet.`
      )
    }

    return NextResponse.json({
      success: true,
      reminded,
      notSubmitted: notSubmitted.map(k => k.name),
    })
  } catch (err) {
    console.error('Reminder error:', err)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
