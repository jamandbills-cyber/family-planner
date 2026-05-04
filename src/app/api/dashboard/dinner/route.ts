import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID

type DinnerRow = { dayIdx: number; meal: string; cook: string }

function getCurrentWeekStart(): string {
  const today = new Date()
  // Sunday-start week
  const day = today.getDay()
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day)
  const y = sunday.getFullYear()
  const m = String(sunday.getMonth() + 1).padStart(2, '0')
  const d = String(sunday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function tryReadFromSupabase(weekStart: string): Promise<DinnerRow[] | null> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('sunday_plans')
      .select('state')
      .eq('week_start', weekStart)
      .maybeSingle()
    if (error || !data) return null
    const dinner = (data as any)?.state?.dinner
    if (Array.isArray(dinner) && dinner.length > 0) return dinner
    return null
  } catch {
    return null
  }
}

async function tryReadFromSheets(weekStart: string): Promise<DinnerRow[] | null> {
  if (!SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return null
  try {
    const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'AdminState!A2:C200',
    })
    const rows = (res.data.values ?? []) as string[][]
    const matching = rows
      .filter(r => r[0] === weekStart)
      .sort((a, b) => (b[1] ?? '').localeCompare(a[1] ?? ''))
    if (matching.length === 0) return null
    const state = JSON.parse(matching[0][2])
    return Array.isArray(state?.dinner) ? state.dinner : null
  } catch {
    return null
  }
}

export async function GET() {
  const weekStart = getCurrentWeekStart()
  const fromSb = await tryReadFromSupabase(weekStart)
  const dinner = fromSb ?? await tryReadFromSheets(weekStart) ?? []
  return NextResponse.json({ dinner, weekStart })
}
