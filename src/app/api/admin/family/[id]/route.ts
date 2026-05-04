import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    const update: Record<string, any> = {}
    if (body.display_name !== undefined) update.display_name = body.display_name
    if (body.name !== undefined)         update.display_name = body.name
    if (body.color !== undefined)        update.color = body.color
    if (body.member_type !== undefined)  update.member_type = body.member_type
    if (body.type !== undefined)         update.member_type = body.type
    if (body.can_drive !== undefined)    update.can_drive = body.can_drive
    if (body.canDrive !== undefined)     update.can_drive = body.canDrive
    if (body.phone !== undefined)        update.phone = body.phone
    if (body.email !== undefined)        update.email = body.email

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
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('family_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
