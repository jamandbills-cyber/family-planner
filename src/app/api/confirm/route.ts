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

    // 1. Save plan to Sheets
    await savePlan(accessToken, weekStart, plan)
    results.planSaved = true

    // 2. Get family members
    const members = await getFamilyMembers(accessToken)
    const adults  = members.filter(m => m.type === 'adult')

    // 3. Email all adults
    const emailAddresses = adults.map(m => m.email).filter(Boolean)
    if (emailAddresses.length > 0) {
      const html = buildWeeklyPlanEmail(plan)
      results.emailSent = await sendEmail(accessToken, {
        to:      emailAddresses,
        subject: `Family Plan: ${plan.weekLabel ?? weekStart}`,
        html,
      })
    }

    // 4. Text adults the live plan link
    const planUrl  = `${APP_URL}/plan`
    const textsTo  = adults.filter(m => m.phone && !m.phone.includes('X'))
    const textResults = await Promise.allSettled(
      textsTo.map(m => sendSMS(m.phone, `Family plan for ${plan.weekLabel ?? 'this week'} is confirmed. View it here: ${planUrl}`))
    )
    results.textsSent = textResults.filter(r => r.status === 'fulfilled' && (r as any).value).length

    // 5. Update Google Calendar
    const calResult = await updateCalendarEvents(accessToken, plan, weekStart)
    results.calendarUpdated  = calResult.updated
    results.calendarCreated  = calResult.created

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('Confirm error:', err)
    return NextResponse.json({ error: 'Confirm failed' }, { status: 500 })
  }
}

// ─── Update existing events + create school events ────────────
async function updateCalendarEvents(
  accessToken: string,
  plan: any,
  weekStart: string
): Promise<{ updated: number; created: number }> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const calendar  = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const wsDate = new Date(weekStart + 'T00:00:00')
  let updated  = 0
  let created  = 0

  for (const day of (plan.schedule ?? [])) {
    const dayIdx = DAYS.indexOf(day.day)
    if (dayIdx === -1) continue

    const eventDate = new Date(wsDate)
    eventDate.setDate(eventDate.getDate() + dayIdx)
    const dateStr = eventDate.toISOString().split('T')[0]

    for (const evt of (day.events ?? [])) {
      if (!evt.title) continue

      const isSchoolDrop   = evt.title.toLowerCase().includes('drop-off') || evt.title.toLowerCase().includes('drop')
      const isSchoolPickup = evt.title.toLowerCase().includes('pick-up')  || evt.title.toLowerCase().includes('pickup')
      const isSchool       = isSchoolDrop || isSchoolPickup

      if (isSchool) {
        // ── Create school events in Google Calendar ─────────────
        if (!evt.time) continue

        const times = parseTimeStr(evt.time, dateStr)
        if (!times) continue

        try {
          await calendar.events.insert({
            calendarId,
            requestBody: {
              summary:     evt.title,
              description: evt.driver ? `🚗 Driver: ${evt.driver}` : 'Driver TBD',
              start:       { dateTime: times.start, timeZone: 'America/Denver' },
              end:         { dateTime: times.end,   timeZone: 'America/Denver' },
              colorId:     '7', // blue/peacock for school
            },
          })
          created++
        } catch (err) {
          console.error('School event create error:', err)
        }

      } else if (evt.driver) {
        // ── Update existing event with driver info ───────────────
        try {
          const listRes = await calendar.events.list({
            calendarId,
            timeMin: `${dateStr}T00:00:00-06:00`,
            timeMax: `${dateStr}T23:59:59-06:00`,
            q:       evt.title,
            singleEvents: true,
            maxResults: 10,
          })

          const existing = listRes.data.items?.find(e => {
            const calTitle = (e.summary ?? '').toLowerCase()
            const evtTitle = evt.title.toLowerCase()
            return calTitle.includes(evtTitle) || evtTitle.includes(calTitle)
          })

          if (existing?.id) {
            const existingDesc = existing.description ?? ''
            // Don't double-add driver info
            const driverLine   = `🚗 Driver: ${evt.driver}`
            const newDesc      = existingDesc.includes('🚗 Driver')
              ? existingDesc.replace(/🚗 Driver:.*(\n|$)/, `${driverLine}\n`)
              : `${driverLine}\n\n${existingDesc}`.trim()

            await calendar.events.patch({
              calendarId,
              eventId: existing.id,
              requestBody: {
                description: newDesc,
                colorId:     '11', // tomato red = driver assigned
              },
            })
            updated++
          }
        } catch (err) {
          console.error('Calendar update error:', err)
        }
      }
    }
  }

  return { updated, created }
}

// ─── Parse time string into start/end ISO datetimes ──────────
function parseTimeStr(timeStr: string, dateStr: string): { start: string; end: string } | null {
  if (!timeStr || timeStr === 'All Day') return null

  const tz = '-06:00' // Mountain time

  function toISO(h: number, m: number): string {
    return `${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00${tz}`
  }

  function parseHour(h: string, m: string, period: string): number {
    let hour = parseInt(h)
    const mins = parseInt(m || '0')
    if (period?.toUpperCase() === 'PM' && hour !== 12) hour += 12
    if (period?.toUpperCase() === 'AM' && hour === 12) hour  = 0
    return hour
  }

  // Range: "7:30 AM–8:30 AM" or "3 PM–4 PM"
  const rangeMatch = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)?\s*[–\-]\s*(\d+):?(\d*)\s*(AM|PM)/i)
  if (rangeMatch) {
    const startH = parseHour(rangeMatch[1], rangeMatch[2], rangeMatch[3] ?? rangeMatch[6])
    const endH   = parseHour(rangeMatch[4], rangeMatch[5], rangeMatch[6])
    const startM = parseInt(rangeMatch[2] || '0')
    const endM   = parseInt(rangeMatch[5] || '0')
    return { start: toISO(startH, startM), end: toISO(endH, endM) }
  }

  // Single: "7:30 AM"
  const singleMatch = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)/i)
  if (singleMatch) {
    const h = parseHour(singleMatch[1], singleMatch[2], singleMatch[3])
    const m = parseInt(singleMatch[2] || '0')
    return { start: toISO(h, m), end: toISO(h + 1, m) }
  }

  return null
}