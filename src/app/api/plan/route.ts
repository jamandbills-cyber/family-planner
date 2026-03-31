import { NextResponse } from 'next/server'
import { getLatestPlan } from '@/lib/sheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plan = await getLatestPlan(accessToken)
    if (!plan) {
      return NextResponse.json({ error: 'No plan found' }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (err) {
    console.error('Plan fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 })
  }
}
