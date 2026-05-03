import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase'
import { randomBytes } from 'crypto'

async function requireAdmin() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase.from('family_members')
    .select('role').eq('auth_user_id', user.id).single()
  return me?.role === 'admin' ? user : null
}

function makeToken() {
  // 32 random bytes → 43-character URL-safe base64 string
  return randomBytes(32).toString('base64url')
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data: device, error } = await getSupabaseAdmin()
    .from('device_tokens')
    .insert({
      token: makeToken(),
      label: body.label,
      view_type: body.view_type,
      member_id: body.member_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ device })
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...patch } = await req.json()
  const { error } = await getSupabaseAdmin().from('device_tokens').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await getSupabaseAdmin().from('device_tokens').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
