import { NextRequest, NextResponse } from 'next/server'
import { startOfWeek, format } from 'date-fns'
import { getSundayPlan } from '@/lib/sunday-plan'

const CRON_SECRET = process.env.CRON_SECRET!
const APP_URL     = process.env.NEXTAUTH_URL ?? 'https://family-planner-tawny.vercel.app'

// Vercel Cron hits this every Sunday at 8:00 AM (UTC 14:00).
// No more Google access token needed — Sunday Plan state lives in Supabase.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const weekStart = format(
      startOfWeek(new Date(), { weekStartsOn: 0 }),
      'yyyy-MM-dd'
    )

    const state = await getSundayPlan(weekStart)
    if (!state) {
      console.log('Cron: No admin state found for this week — skipping')
      return NextResponse.json({ skipped: true, reason: 'No admin state for this week' })
    }
    if (!state.isReady) {
      console.log('Cron: Admin has not marked this week as ready — skipping')
      return NextResponse.json({ skipped: true, reason: 'Not marked as ready' })
    }

    // Trigger send-forms (this still needs the admin-token flow internally)
    const sendRes = await fetch(`${APP_URL}/api/send-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': CRON_SECRET,
      },
      body: JSON.stringify({ weekStart }),
    })

    const result = await sendRes.json()
    console.log('Cron: Forms sent', result)

    return NextResponse.json({ success: true, weekStart, result })
  } catch (err) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
