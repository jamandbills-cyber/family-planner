import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// List all devices
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('device_tokens')
    .select('id, token, label, view_type, member_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Devices list error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ devices: data ?? [] })
}

// Create a new device
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { label, view_type, member_id } = body
    if (!label || !view_type) {
      return NextResponse.json({ error: 'label and view_type required' }, { status: 400 })
    }
    if (!['kitchen', 'personal'].includes(view_type)) {
      return NextResponse.json({ error: 'view_type must be kitchen or personal' }, { status: 400 })
    }
    if (view_type === 'personal' && !member_id) {
      return NextResponse.json({ error: 'personal devices require member_id' }, { status: 400 })
    }

    const token = randomBytes(16).toString('hex')

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('device_tokens')
      .insert({
        token,
        label,
        view_type,
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
