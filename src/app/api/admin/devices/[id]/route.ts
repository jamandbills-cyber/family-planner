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
  const { error } = await supabase.from('device_tokens').delete().eq('id', id)
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
    if (body.label !== undefined)       update.label = body.label
    if (body.orientation !== undefined) {
      update.orientation = body.orientation === 'portrait' ? 'portrait' : 'landscape'
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('device_tokens')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ device: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
