import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdminMember } from '@/lib/auth-helpers'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const { name } = await params
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from('family-photos').remove([name])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
