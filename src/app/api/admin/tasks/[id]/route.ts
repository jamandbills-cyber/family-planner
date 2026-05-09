import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdminMember } from '@/lib/auth-helpers'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const { id } = await params
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const { id } = await params
  try {
    const body = await req.json()
    const update: any = {}
    if (body.text !== undefined)         update.text = body.text
    if (body.due_date !== undefined)     update.due_date = body.due_date || null
    if (body.completed !== undefined)    update.completed_at = body.completed ? new Date().toISOString() : null
    if (body.project_id !== undefined)   update.project_id = body.project_id
    if (body.pinned !== undefined)       update.pinned = body.pinned

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('tasks')
      .update(update)
      .eq('id', id)
      .select(`
        id, text, due_date, completed_at, created_at, owner_id, creator_id, project_id, pinned,
        owner:family_members!tasks_owner_id_fkey(id, display_name, color),
        project:projects(id, name, color)
      `)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
