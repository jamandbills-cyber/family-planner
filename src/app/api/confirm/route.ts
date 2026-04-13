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

// ─── Create calendar events for each driver assignment ────────
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

  // Parse weekStart to get actual dates
  const wsDate = new Date(weekStart + 'T00:00:00')
  let created = 0

  for (const day of (plan.schedule ?? [])) {
    const dayIdx = DAYS.indexOf(day.day)
    if (dayIdx === -1) continue

    const eventDate = new Date(wsDate)
    eventDate.setDate(eventDate.getDate() + dayIdx)
    const dateStr = eventDate.toISOString().split('T')[0]

    for (const evt of (day.events ?? [])) {
      if (!evt.driver || !evt.title) continue

      // Parse time string to get start/end
      const times = parseTimeRange(evt.time, dateStr)
      if (!times) continue

      try {
        await calendar.events.insert({
          calendarId,
          requestBody: {
            summary:     `🚗 Drive: ${evt.title}`,
            description: `${evt.driver} is driving for this event.\n\nLocation: ${evt.location ?? ''}`,
            location:    evt.location ?? '',
            start:       { dateTime: times.start, timeZone: 'America/Denver' },
            end:         { dateTime: times.end,   timeZone: 'America/Denver' },
            colorId:     '11', // tomato red
          },
        })
        created++
      } catch (err) {
        console.error('Calendar event create error:', err)
      }
    }
  }

  return created
}

// ─── Parse "4:00–6:00 PM" or "4:00 PM" into ISO datetimes ────
function parseTimeRange(timeStr: string, dateStr: string): { start: string; end: string } | null {
  if (!timeStr || timeStr === 'All Day') return null

  const rangeMatch = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)?\s*[–-]\s*(\d+):?(\d*)\s*(AM|PM)/i)
  const singleMatch = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)/i)

  function toISO(h: number, m: number): string {
    const d = new Date(`${dateStr}T00:00:00`)
    d.setHours(h, m, 0, 0)
    return d.toISOString().replace('.000Z', '-06:00').slice(0, 19) + '-06:00'
  }

  function parseHour(h: string, m: string, period: string): number {
    let hour = parseInt(h)
    const mins = parseInt(m || '0')
    if (period?.toUpperCase() === 'PM' && hour !== 12) hour += 12
    if (period?.toUpperCase() === 'AM' && hour === 12) hour = 0
    return hour
  }

  if (rangeMatch) {
    const startH = parseHour(rangeMatch[1], rangeMatch[2], rangeMatch[3] ?? rangeMatch[6])
    const endH   = parseHour(rangeMatch[4], rangeMatch[5], rangeMatch[6])
    const startM = parseInt(rangeMatch[2] || '0')
    const endM   = parseInt(rangeMatch[5] || '0')
    return { start: toISO(startH, startM), end: toISO(endH, endM) }
  }

  if (singleMatch) {
    const h = parseHour(singleMatch[1], singleMatch[2], singleMatch[3])
    const m = parseInt(singleMatch[2] || '0')
    return { start: toISO(h, m), end: toISO(h + 1, m) } // default 1 hour
  }

  return null
}
