import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdminMember } from '@/lib/auth-helpers'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const { id } = await params
  try {
    const body = await req.json()
    const update: Record<string, any> = {}

    // Map both snake_case and camelCase / legacy names to real columns
    if (body.display_name !== undefined) update.display_name = body.display_name
    if (body.name !== undefined)         update.display_name = body.name
    if (body.username !== undefined)     update.username = body.username
    if (body.email !== undefined)        update.email = body.email
    if (body.type !== undefined)         update.type = body.type
    if (body.member_type !== undefined)  update.type = body.member_type
    if (body.role !== undefined)         update.role = body.role
    if (body.color !== undefined)        update.color = body.color
    if (body.phone !== undefined)        update.phone = body.phone
    if (body.can_drive !== undefined)    update.can_drive = body.can_drive
    if (body.canDrive !== undefined)     update.can_drive = body.canDrive
    if (body.ics_feeds !== undefined)    update.ics_feeds = body.ics_feeds
    if (body.auth_user_id !== undefined) update.auth_user_id = body.auth_user_id

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('family_members')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ member: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const { id } = await params
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('family_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
