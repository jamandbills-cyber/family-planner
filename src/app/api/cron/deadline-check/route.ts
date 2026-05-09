import { NextRequest, NextResponse } from 'next/server'
import { requireInternalRequest } from '@/lib/internal-auth'

// Called by Vercel Cron — checks deadline and sends reminders
// Schedule is set to run every Sunday at 11 PM UTC (5 PM Mountain)
// vercel.json: "schedule": "0 23 * * 0"
export async function GET(req: NextRequest) {
  const unauthorized = requireInternalRequest(req)
  if (unauthorized) return unauthorized

  // This endpoint is a placeholder — actual reminder logic
  // is triggered manually from the admin page via /api/send-reminders
  // Full cron automation with stored tokens is a future enhancement
  console.log('Deadline check cron fired')
  return NextResponse.json({ fired: true })
}
