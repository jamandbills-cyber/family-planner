import { NextRequest, NextResponse } from 'next/server'
import { startOfWeek, format } from 'date-fns'
import { getSundayPlan } from '@/lib/sunday-plan'
import { requireInternalRequest } from '@/lib/internal-auth'
import { getAppUrl } from '@/lib/app-url'

export async function GET(req: NextRequest) {
  const unauthorized = requireInternalRequest(req)
  if (unauthorized) return unauthorized
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const sendRes = await fetch(`${getAppUrl(req)}/api/send-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': cronSecret,
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
