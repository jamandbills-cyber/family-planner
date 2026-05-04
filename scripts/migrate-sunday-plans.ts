// One-time migration: copy AdminState rows from Google Sheet into Supabase.
// Run via: node --env-file=.env.local --import tsx scripts/migrate-sunday-plans.ts

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SHEETS_ID)             throw new Error('Missing GOOGLE_SHEETS_ID')
if (!SERVICE_ACCOUNT_KEY)   throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY')
if (!SUPABASE_URL)          throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!SUPABASE_SERVICE_ROLE) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

async function main() {
  const credentials = JSON.parse(SERVICE_ACCOUNT_KEY!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID!,
    range: 'AdminState!A2:C200',
  })
  const rows = (res.data.values ?? []) as string[][]

  if (rows.length === 0) {
    console.log('No AdminState rows found in sheet — nothing to migrate.')
    return
  }

  const byWeek = new Map<string, { savedAt: string; state: string }>()
  for (const r of rows) {
    const [weekStart, savedAt, stateJSON] = r
    if (!weekStart || !stateJSON) continue
    const existing = byWeek.get(weekStart)
    if (!existing || (savedAt ?? '').localeCompare(existing.savedAt) > 0) {
      byWeek.set(weekStart, { savedAt: savedAt ?? '', state: stateJSON })
    }
  }
  console.log(`Found ${byWeek.size} unique weeks in sheet.`)

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let success = 0
  let failed = 0

  for (const [weekStart, { savedAt, state }] of byWeek.entries()) {
    let parsed: any
    try {
      parsed = JSON.parse(state)
    } catch {
      console.error(`  ✗ ${weekStart} — invalid JSON in sheet, skipping`)
      failed++
      continue
    }

    const { error } = await supabase
      .from('sunday_plans')
      .upsert({
        week_start: weekStart,
        state: parsed,
        updated_at: savedAt && !isNaN(Date.parse(savedAt)) ? savedAt : new Date().toISOString(),
      }, { onConflict: 'week_start' })

    if (error) {
      console.error(`  ✗ ${weekStart} — ${error.message}`)
      failed++
    } else {
      console.log(`  ✓ ${weekStart}`)
      success++
    }
  }

  console.log(`\nMigration complete: ${success} succeeded, ${failed} failed.`)
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
