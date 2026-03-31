import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { startOfWeek, format, addWeeks } from 'date-fns'

const SHEETS_ID    = process.env.GOOGLE_SHEETS_ID!
const CRON_SECRET  = process.env.CRON_SECRET!
const APP_URL      = process.env.NEXTAUTH_URL ?? 'https://family-planner-tawny.vercel.app'

// This route is called by Vercel Cron every Sunday at 8:00 AM
// vercel.json sets: "schedule": "0 14 * * 0"  (UTC 14:00 = Mountain 8:00 AM)
export async function GET(req: NextRequest) {
  // Verify this is a legitimate cron call
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the admin's stored refresh token from Sheets to make API calls
    // For now we use a service-account-style stored token approach
    // In production this would use a stored refresh token from the admin's first sign-in
    const accessToken = await getStoredAccessToken()
    if (!accessToken) {
      console.error('Cron: No stored access token found')
      return NextResponse.json({ error: 'No access token' }, { status: 500 })
    }

    // Get this week's Sunday date as the weekStart key
    const weekStart = format(
      startOfWeek(new Date(), { weekStartsOn: 0 }),
      'yyyy-MM-dd'
    )

    // Check if admin marked this week as ready
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const sheets = google.sheets({ version: 'v4', auth })

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'AdminState!A2:C200',
    })

    const rows = (res.data.values ?? []) as string[][]
    const thisWeekRow = rows
      .filter(r => r[0] === weekStart)
      .sort((a, b) => b[1].localeCompare(a[1]))[0]

    if (!thisWeekRow) {
      console.log('Cron: No admin state found for this week — skipping')
      return NextResponse.json({ skipped: true, reason: 'No admin state for this week' })
    }

    const state = JSON.parse(thisWeekRow[2] ?? '{}')
    if (!state.isReady) {
      console.log('Cron: Admin has not marked this week as ready — skipping')
      return NextResponse.json({ skipped: true, reason: 'Not marked as ready' })
    }

    // Trigger the send-forms endpoint
    const sendRes = await fetch(`${APP_URL}/api/send-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': CRON_SECRET,
      },
      body: JSON.stringify({ weekStart, accessToken }),
    })

    const result = await sendRes.json()
    console.log('Cron: Forms sent', result)

    return NextResponse.json({ success: true, weekStart, result })
  } catch (err) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

// ─── Get stored admin access token ───────────────────────────
// NOTE: In the current setup, the admin signs in manually each week
// before the cron fires. The cron checks their saved state to see
// if isReady is true — but actually sending requires calling send-forms
// manually from the admin page (button added below).
// Full cron automation with stored refresh tokens is a future enhancement.
async function getStoredAccessToken(): Promise<string | null> {
  // Placeholder — returns null which causes cron to skip
  // Will be implemented with refresh token storage in next iteration
  return null
}
