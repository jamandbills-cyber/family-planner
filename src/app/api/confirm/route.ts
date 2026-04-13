import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { savePlan, getFamilyMembers } from '@/lib/sheets'
import { sendEmail, buildWeeklyPlanEmail } from '@/lib/gmail'
import { sendSMS } from '@/lib/twilio'
import { google } from 'googleapis'

const APP_URL = process.env.NEXTAUTH_URL ?? 'https://family-planner-tawny.vercel.app'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { weekStart, plan } = await req.json()
    if (!weekStart || !plan) {
      return NextResponse.json({ error: 'weekStart and plan required' }, { status: 400 })
    }

    const accessToken = session.accessToken
    const results: Record<string, any> = {}

    // 1. Save the confirmed plan to Google Sheets
    await savePlan(accessToken, weekStart, plan)
    results.planSaved = true

    // 2. Get family members for emails and texts
    const members = await getFamilyMembers(accessToken)
    const adults  = members.filter(m => m.type === 'adult')

    // 3. Send email to all adults with the full plan
    const emailAddresses = adults.map(m => m.email).filter(Boolean)
    if (emailAddresses.length > 0) {
      const html = buildWeeklyPlanEmail(plan)
      const emailSent = await sendEmail(accessToken, {
        to:      emailAddresses,
        subject: `Family Plan: ${plan.weekLabel ?? weekStart}`,
        html,
      })
      results.emailSent = emailSent
    }

    // 4. Text adults only with the live plan link
    const planUrl = `${APP_URL}/plan`
    const textsTo = adults.filter(m => m.phone && !m.phone.includes('X'))
    const textResults = await Promise.allSettled(
      textsTo.map(m => sendSMS(m.phone, `Family plan for ${plan.weekLabel ?? 'this week'} is confirmed. View it here: ${planUrl}`))
    )
    results.textsSent = textResults.filter(r => r.status === 'fulfilled' && r.value).length

    // 5. Create Google Calendar events for driver assignments
    const calendarResults = await createDriverCalendarEvents(accessToken, plan, weekStart)
    results.calendarEvents = calendarResults

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('Confirm error:', err)
    return NextResponse.json({ error: 'Confirm failed' }, { status: 500 })
  }
}

// ─── Update existing calendar events with driver info ─────────
async function createDriverCalendarEvents(
  accessToken: string,
  plan: any,
  weekStart: string
): Promise<number> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const wsDate = new Date(weekStart + 'T00:00:00')
  let updated = 0

  for (const day of (plan.schedule ?? [])) {
    const dayIdx = DAYS.indexOf(day.day)
    if (dayIdx === -1) continue

    const eventDate = new Date(wsDate)
    eventDate.setDate(eventDate.getDate() + dayIdx)
    const dateStr = eventDate.toISOString().split('T')[0]

    for (const evt of (day.events ?? [])) {
      if (!evt.driver || !evt.title) continue

      try {
        // Search for the existing event on this date
        const listRes = await calendar.events.list({
          calendarId,
          timeMin: `${dateStr}T00:00:00-06:00`,
          timeMax: `${dateStr}T23:59:59-06:00`,
          q: evt.title,
          singleEvents: true,
        })

        const existing = listRes.data.items?.find(e =>
          e.summary?.toLowerCase().includes(evt.title.toLowerCase()) ||
          evt.title.toLowerCase().includes((e.summary ?? '').toLowerCase())
        )

        if (existing?.id) {
          // Update the existing event with driver info
          await calendar.events.patch({
            calendarId,
            eventId: existing.id,
            requestBody: {
              description: `🚗 Driver: ${evt.driver}\n\n${existing.description ?? ''}`.trim(),
              colorId: '11', // tomato to indicate driver assigned
            },
          })
          updated++
        }
      } catch (err) {
        console.error('Calendar event update error:', err)
      }
    }
  }

  return updated
}