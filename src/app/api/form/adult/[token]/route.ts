import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToken, getFamilyMembers } from '@/lib/sheets'
import { getWeekRange } from '@/lib/google-calendar'
import { google } from 'googleapis'
import { format } from 'date-fns'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!
const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const session = await getServerSession(authOptions)
  const accessToken = session?.accessToken
  if (!accessToken) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  try {
    const tokenRecord = await getToken(accessToken, token)
    if (!tokenRecord || tokenRecord.formType !== 'adult') {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    const members = await getFamilyMembers(accessToken)
    const member  = members.find(m => m.id === tokenRecord.memberId)
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Load admin state for this week
    const weekStart = tokenRecord.weekStart
    let adminEvents: any[] = []
    try {
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })
      const sheets = google.sheets({ version: 'v4', auth })
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEETS_ID,
        range: 'AdminState!A2:C200',
      })
      const rows = (res.data.values ?? []) as string[][]
      const row = rows
        .filter(r => r[0] === weekStart)
        .sort((a, b) => b[1].localeCompare(a[1]))[0]
      if (row?.[2]) {
        const state = JSON.parse(row[2])
        adminEvents = state.events ?? []
      }
    } catch (err) {
      console.warn('Could not load admin state:', err)
    }

    const range = getWeekRange(new Date(weekStart + 'T00:00:00'))
    const weekLabel = `Week of ${format(range.weekStart, 'MMM d')} – ${format(range.weekEnd, 'MMM d, yyyy')}`

    // Build events by day for the grid
    const eventsByDay: Record<number, any[]> = {}
    for (let i = 0; i < 7; i++) eventsByDay[i] = []
    
    for (const e of adminEvents) {
      if (e.dayIdx === undefined) continue
      eventsByDay[e.dayIdx].push({
        id:              e.id,
        title:           e.title,
        time:            e.time,
        location:        e.location ?? '',
        transportStatus: e.transportStatus ?? 'unset',
        driverId:        e.driverId ?? null,
        needsDriver:     e.transportStatus === 'needs_driver' && !e.driverId && !e.id?.startsWith('school_'),
      })
    }

    // School defaults — which days is this adult the default driver?
    // school_drop_N = AM, school_pickup_N = PM
    const schoolDefaults: Record<string, { am: boolean; pm: boolean }> = {
      Monday: { am: false, pm: false },
      Tuesday: { am: false, pm: false },
      Wednesday: { am: false, pm: false },
      Thursday: { am: false, pm: false },
      Friday: { am: false, pm: false },
    }
    const DAY_MAP: Record<number, string> = { 1:'Monday', 2:'Tuesday', 3:'Wednesday', 4:'Thursday', 5:'Friday' }
    for (const e of adminEvents) {
      if (!e.id?.startsWith('school_')) continue
      const dayName = DAY_MAP[e.dayIdx]
      if (!dayName) continue
      if (e.driverId === member.id) {
        if (e.id.startsWith('school_drop_')) schoolDefaults[dayName].am = true
        if (e.id.startsWith('school_pickup_')) schoolDefaults[dayName].pm = true
      }
    }

    return NextResponse.json({
      name:         member.name,
      memberId:     member.id,
      weekLabel,
      weekStart,
      eventsByDay,
      schoolDefaults,
    })
  } catch (err) {
    console.error('Adult form error:', err)
    return NextResponse.json({ error: 'Failed to load form data' }, { status: 500 })
  }
}
