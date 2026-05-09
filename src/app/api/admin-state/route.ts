import { NextRequest, NextResponse } from 'next/server'
import { getSundayPlan, saveSundayPlan } from '@/lib/sunday-plan'
import { requireAdminMember } from '@/lib/auth-helpers'

export async function GET(req: NextRequest) {
  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
  }

  try {
    const state = await getSundayPlan(weekStart)
    if (!state) return NextResponse.json({ found: false })
    return NextResponse.json({ found: true, state })
  } catch (err) {
    console.error('Load state error:', err)
    return NextResponse.json({ error: 'Failed to load state' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  try {
    // Support both JSON body and Blob/sendBeacon body (text)
    let weekStart: string | undefined
    let state: any
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      weekStart = body.weekStart
      state = body.state
    } else {
      // sendBeacon sends as Blob with type 'application/json' — but if any
      // browser sends it as text, parse manually
      const text = await req.text()
      try {
        const body = JSON.parse(text)
        weekStart = body.weekStart
        state = body.state
      } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
      }
    }

    if (!weekStart || !state) {
      return NextResponse.json({ error: 'weekStart and state required' }, { status: 400 })
    }
    await saveSundayPlan(weekStart, state)
    return NextResponse.json({ saved: true, savedAt: new Date().toISOString() })
  } catch (err) {
    console.error('Save state error:', err)
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 })
  }
}
