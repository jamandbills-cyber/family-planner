import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdminMember } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  const ownerId = req.nextUrl.searchParams.get('owner_id')
                ?? req.nextUrl.searchParams.get('member_id')
  const supabase = getSupabaseAdmin()
  let q = supabase.from('projects').select('id, name, color, owner_id, status, is_shared').order('name', { ascending: true })
  if (ownerId) q = q.eq('owner_id', ownerId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  try {
    const body = await req.json()
    const owner_id = body.owner_id ?? body.member_id
    const name = (body.name ?? '').toString().trim()
    const color = body.color ?? null
    if (!owner_id || !name) {
      return NextResponse.json({ error: 'owner_id and name required' }, { status: 400 })
    }
    const insert: any = { owner_id, name, is_shared: body.is_shared ?? false }
    if (color !== null) insert.color = color

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('projects')
      .insert(insert)
      .select('id, name, color, owner_id, status, is_shared')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ project: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
