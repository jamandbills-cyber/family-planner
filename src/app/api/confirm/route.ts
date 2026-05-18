import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmailWithResult, buildWeeklyPlanEmail } from '@/lib/gmail'
import { sendSMS } from '@/lib/twilio'
import { getAppUrl } from '@/lib/app-url'
import { requireAdminMember } from '@/lib/auth-helpers'
import { getPlanningMembers, publishPlanningPlan } from '@/lib/planning-data'
import { google } from 'googleapis'
import {
  dedupeManagedEvents,
  findLegacySchoolMatches,
  googleEventIdFromSource,
  HOUSEHOLD_TZ,
  inferSchoolSourceId,
  isSchoolPlanEvent,
  listDayEvents,
  listEventsByPlannerId,
  makeFamilyPlannerId,
  managedEventBody,
} from '@/lib/google-calendar-managed'

export async function POST(req: NextRequest) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Google Calendar access is not connected. Sign out and sign back in with Google from the admin page.' }, { status: 401 })
  }
  if (session.error) {
    return NextResponse.json({ error: 'Google Calendar access expired. Sign out and sign back in with Google from the admin page.' }, { status: 401 })
  }

  try {
    const { weekStart, plan } = await req.json()
    if (!weekStart || !plan) {
      return NextResponse.json({ error: 'weekStart and plan required' }, { status: 400 })
    }

    const accessToken = session.accessToken
    const results: Record<string, any> = {}

    // 1. Publish plan to Supabase
    await publishPlanningPlan(weekStart, plan)
    results.planSaved = true

    // 2. Get family members
    const members = await getPlanningMembers()
    const adults  = members.filter(m => m.type === 'adult')

    // 3. Email all adults
    const emailAddresses = adults.map(m => m.email).filter(Boolean)
    results.emailRecipients = emailAddresses.length
    if (emailAddresses.length > 0) {
      const html = buildWeeklyPlanEmail(plan)
      const emailResult = await sendEmailWithResult({
        to:      emailAddresses,
        subject: `Family Plan: ${plan.weekLabel ?? weekStart}`,
        html,
      })
      results.emailSent = emailResult.ok
      if (!results.emailSent) {
        results.emailError = emailResult.error ?? 'Resend email send failed. Confirm RESEND_API_KEY and EMAIL_FROM are configured in Vercel.'
      }
    } else {
      results.emailSent = false
      results.emailError = 'No adult email addresses are configured.'
    }

    // 4. Text adults the live plan link
    const planUrl  = `${getAppUrl(req)}/plan`
    const textsTo  = adults.filter(m => m.phone && !m.phone.includes('X'))
    const textResults = await Promise.allSettled(
      textsTo.map(m => sendSMS(m.phone, `Family plan for ${plan.weekLabel ?? 'this week'} is confirmed. View it here: ${planUrl}`))
    )
    results.textsSent = textResults.filter(r => r.status === 'fulfilled' && (r as any).value).length

    // 5. Update Google Calendar
    const calResult = await updateCalendarEvents(accessToken, plan, weekStart)
    results.calendarUpdated  = calResult.updated
    results.calendarCreated  = calResult.created
    results.calendarDeduped  = calResult.deduped

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
): Promise<{ updated: number; created: number; deduped: number }> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const calendar  = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const wsDate = new Date(weekStart + 'T00:00:00')
  let updated  = 0
  let created  = 0
  let deduped  = 0

  const dayEventsCache = new Map<string, Awaited<ReturnType<typeof listDayEvents>>>()

  async function getDayEvents(dateStr: string) {
    if (!dayEventsCache.has(dateStr)) {
      dayEventsCache.set(dateStr, await listDayEvents(calendar, calendarId, dateStr))
    }
    return dayEventsCache.get(dateStr)!
  }

  for (const day of (plan.schedule ?? [])) {
    const dayIdx = DAYS.indexOf(day.day)
    if (dayIdx === -1) continue

    const eventDate = new Date(wsDate)
    eventDate.setDate(eventDate.getDate() + dayIdx)
    const dateStr = eventDate.toISOString().split('T')[0]

    for (const evt of (day.events ?? [])) {
      if (!evt.title) continue

      if (isSchoolPlanEvent(evt.sourceId, evt.title)) {
        if (!evt.time) continue

        const times = parseTimeStr(evt.time, dateStr)
        if (!times) continue

        const sourceId =
          evt.sourceId ??
          inferSchoolSourceId(evt.title, dayIdx) ??
          `school_slot_${dayIdx}_${evt.title.toLowerCase().replace(/\s+/g, '_').slice(0, 40)}`
        const plannerId = makeFamilyPlannerId(weekStart, sourceId)

        try {
          const tagged = await listEventsByPlannerId(calendar, calendarId, plannerId)
          const { kept: taggedKeep, removed: taggedRemoved } = await dedupeManagedEvents(
            calendar,
            calendarId,
            tagged,
          )
          deduped += taggedRemoved

          let existing = taggedKeep
          if (!existing?.id) {
            const dayEvents = await getDayEvents(dateStr)
            const legacyMatches = findLegacySchoolMatches(dayEvents, evt.title, plannerId)
            const { kept: legacyKeep, removed: legacyRemoved } = await dedupeManagedEvents(
              calendar,
              calendarId,
              legacyMatches,
            )
            deduped += legacyRemoved
            existing = legacyKeep ?? undefined
          }

          const description = evt.driver ? `🚗 Driver: ${evt.driver}` : 'Driver TBD'
          const start = { dateTime: times.start, timeZone: HOUSEHOLD_TZ }
          const end = { dateTime: times.end, timeZone: HOUSEHOLD_TZ }
          const requestBody = managedEventBody(
            plannerId,
            evt.title,
            description,
            start,
            end,
            '7',
          )

          if (existing?.id) {
            await calendar.events.patch({
              calendarId,
              eventId: existing.id,
              requestBody,
            })
            updated++
          } else {
            await calendar.events.insert({
              calendarId,
              requestBody,
            })
            created++
          }
        } catch (err) {
          console.error('School event upsert error:', err)
        }

      } else if (evt.driver) {
        try {
          const googleId = googleEventIdFromSource(evt.sourceId)
          let existingId = googleId

          if (!existingId) {
            const dayEvents = await getDayEvents(dateStr)
            const evtTitle = evt.title.toLowerCase()
            const match = dayEvents.find(e => {
              const calTitle = (e.summary ?? '').toLowerCase()
              return calTitle.includes(evtTitle) || evtTitle.includes(calTitle)
            })
            existingId = match?.id ?? null
          }

          if (!existingId) continue

          const existing = await calendar.events.get({
            calendarId,
            eventId: existingId,
          })
          const existingDesc = existing.data.description ?? ''
          const driverLine   = `🚗 Driver: ${evt.driver}`
          const newDesc      = existingDesc.includes('🚗 Driver')
            ? existingDesc.replace(/🚗 Driver:.*(\n|$)/, `${driverLine}\n`)
            : `${driverLine}\n\n${existingDesc}`.trim()

          await calendar.events.patch({
            calendarId,
            eventId: existingId,
            requestBody: {
              description: newDesc,
              colorId:     '11',
            },
          })
          updated++
        } catch (err) {
          console.error('Calendar update error:', err)
        }
      }
    }
  }

  return { updated, created, deduped }
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