import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ideas')
    .select(`
      id, text, created_at, owner_id, creator_id, project_id, is_shared,
      owner:family_members!ideas_owner_id_fkey(id, display_name, color)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message, ideas: [] }, { status: 500 })
  return NextResponse.json({ ideas: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const owner_id   = body.owner_id ?? body.member_id
    const text       = (body.text ?? '').toString().trim()
    const creator_id = body.creator_id ?? owner_id
    const project_id = body.project_id ?? null

    if (!owner_id || !text) {
      return NextResponse.json({ error: 'owner_id and text required' }, { status: 400 })
    }

    const insert: any = { owner_id, creator_id, text }
    if (project_id) insert.project_id = project_id

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('ideas')
      .insert(insert)
      .select(`
        id, text, created_at, owner_id, creator_id, project_id, is_shared,
        owner:family_members!ideas_owner_id_fkey(id, display_name, color)
      `)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ idea: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
