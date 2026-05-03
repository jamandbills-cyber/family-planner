// One-time migration: Google Sheet "Family" tab → Supabase family_members + auth users
//
// Usage from repo root:
//   npx tsx scripts/migrate-roster.ts
//
// Required env vars (in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_SHEETS_ID
//   GOOGLE_SERVICE_ACCOUNT_KEY  (full JSON string)
//
// Idempotent: safe to re-run. Skips members that already exist in Supabase.

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { randomBytes } from 'crypto'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

function deriveUsername(name: string, existing: Set<string>): string {
  const first = name.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '')
  if (!existing.has(first)) return first
  const parts = name.toLowerCase().split(/\s+/)
  const lastInit = parts[1]?.[0] ?? ''
  const combo = `${first}${lastInit}`.replace(/[^a-z0-9]/g, '')
  if (!existing.has(combo)) return combo
  let i = 1
  while (existing.has(`${first}${i}`)) i++
  return `${first}${i}`
}

async function main() {
  console.log('Reading Family sheet…')
  const sheets = await getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
    range: 'Family!A2:G100',
  })
  const rows = res.data.values ?? []
  console.log(`Found ${rows.length} family members in sheet\n`)

  const { data: existing } = await supabase.from('family_members').select('username, id')
  const existingUsernames = new Set(existing?.map(m => m.username) ?? [])
  const existingIds = new Set(existing?.map(m => m.id) ?? [])

  let created = 0, skipped = 0, failed = 0

  for (const row of rows) {
    const [id, name, type, phone, email, color, canDrive] = row

    if (!id || !name || !email) {
      console.warn(`  ⚠ Skipping incomplete row: ${row.join(' | ')}`)
      failed++
      continue
    }

    if (existingIds.has(id)) {
      console.log(`  ↺ ${id} already migrated, skipping`)
      skipped++
      continue
    }

    const username = deriveUsername(name, existingUsernames)
    existingUsernames.add(username)

    // 1. Create Supabase Auth user with random password (member sets real one later)
    const tempPassword = randomBytes(24).toString('base64')
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: name, username },
    })
    if (authErr) {
      console.error(`  ✗ Auth user failed for ${name}: ${authErr.message}`)
      failed++
      continue
    }

    // 2. Insert family_members row
    const { error: memberErr } = await supabase.from('family_members').insert({
      id,
      username,
      email,
      display_name: name,
      type: type === 'adult' ? 'adult' : 'child',
      role: type === 'adult' ? 'admin' : 'member',
      phone: phone || null,
      color: color || null,
      can_drive: canDrive === 'true' || canDrive === 'TRUE',
      auth_user_id: authUser.user.id,
    })
    if (memberErr) {
      console.error(`  ✗ Member insert failed for ${name}: ${memberErr.message}`)
      await supabase.auth.admin.deleteUser(authUser.user.id)
      failed++
      continue
    }

    console.log(`  ✓ ${name} → username "${username}"`)
    created++
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Failed: ${failed}`)
  if (created > 0) {
    console.log('\nNext step: each member visits /login, types their username, and clicks')
    console.log('"Or sign in with email link" to get a magic link. After signing in they')
    console.log('go to /profile to set a real password.')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
