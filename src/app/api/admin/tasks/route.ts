import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase'

async function requireAuthedMember() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase.from('family_members')
    .select('id, role').eq('auth_user_id', user.id).single()
  return me
}

export async function POST(req: NextRequest) {
  const me = await requireAuthedMember()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // Anyone authenticated can create tasks; creator_id is the logged-in member
  const { data: task, error } = await getSupabaseAdmin()
    .from('tasks')
    .insert({ ...body, creator_id: me.id })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ task })
}

export async function PATCH(req: NextRequest) {
  const me = await requireAuthedMember()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...patch } = await req.json()
  const { error } = await getSupabaseAdmin().from('tasks').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const me = await requireAuthedMember()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await getSupabaseAdmin().from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
