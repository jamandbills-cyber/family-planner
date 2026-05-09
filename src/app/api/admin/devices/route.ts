import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdminMember } from '@/lib/auth-helpers'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('device_tokens')
    .select('id, token, label, view_type, orientation, member_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Devices list error:', error)
    return NextResponse.json({ error: error.message, devices: [] }, { status: 500 })
  }
  // Backfill any NULL orientation as landscape on the way out
  const devices = (data ?? []).map(d => ({
    ...d,
    orientation: d.orientation ?? 'landscape',
  }))
  return NextResponse.json({ devices })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  try {
    const body = await req.json()
    const { label, view_type, member_id, orientation } = body
    if (!label || !view_type) {
      return NextResponse.json({ error: 'label and view_type required' }, { status: 400 })
    }
    if (!['kitchen', 'personal'].includes(view_type)) {
      return NextResponse.json({ error: 'view_type must be kitchen or personal' }, { status: 400 })
    }
    if (view_type === 'personal' && !member_id) {
      return NextResponse.json({ error: 'personal devices require member_id' }, { status: 400 })
    }
    const orient = orientation === 'portrait' ? 'portrait' : 'landscape'

    const token = randomBytes(16).toString('hex')

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('device_tokens')
      .insert({
        token,
        label,
        view_type,
        orientation: orient,
        member_id: view_type === 'personal' ? member_id : null,
      })
      .select()
      .single()
    if (error) {
      console.error('Device create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ device: data })
  } catch (err: any) {
    console.error('Device create error:', err)
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
