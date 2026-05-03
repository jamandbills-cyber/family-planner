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

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabaseAdmin = getSupabaseAdmin()

  // Create auth user with random password — they reset it on first login or via profile
  const tempPassword = randomBytes(24).toString('base64')
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { display_name: body.display_name, username: body.username },
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  const { data: member, error: memberErr } = await supabaseAdmin.from('family_members')
    .insert({ ...body, auth_user_id: authUser.user.id })
    .select()
    .single()

  if (memberErr) {
    // Roll back the auth user if member insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: memberErr.message }, { status: 400 })
  }
  return NextResponse.json({ member })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...patch } = await req.json()
  const { error } = await getSupabaseAdmin().from('family_members').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const supabaseAdmin = getSupabaseAdmin()

  const { data: member } = await supabaseAdmin.from('family_members')
    .select('auth_user_id').eq('id', id).single()

  await supabaseAdmin.from('family_members').delete().eq('id', id)
  if (member?.auth_user_id) {
    await supabaseAdmin.auth.admin.deleteUser(member.auth_user_id)
  }
  return NextResponse.json({ ok: true })
}
