import { NextResponse } from 'next/server'
import { getRollingDinner } from '@/lib/dashboard-display'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ dinner: await getRollingDinner() })
  } catch (err) {
    console.error('Dashboard dinner fetch error:', err)
    return NextResponse.json({ dinner: [] })
  }
}
