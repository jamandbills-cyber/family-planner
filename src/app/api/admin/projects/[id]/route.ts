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
    if (body.name !== undefined) update.name = body.name
    if (body.color !== undefined) update.color = body.color
    if (body.owner_id !== undefined) update.owner_id = body.owner_id
    if (body.status !== undefined) update.status = body.status
    if (body.is_shared !== undefined) update.is_shared = body.is_shared

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No supported project fields provided' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('projects')
      .update(update)
      .eq('id', id)
      .select('id, name, color, owner_id, status, is_shared')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ project: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
