import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getOrCreatePersonalProject(ownerId: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', ownerId)
    .ilike('name', 'Personal')
    .maybeSingle()
  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('projects')
    .insert({ owner_id: ownerId, name: 'Personal' })
    .select('id')
    .single()
  if (error) throw new Error(`Personal project: ${error.message}`)
  return created.id
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id, text, due_date, completed_at, created_at, owner_id, creator_id, project_id, pinned,
      owner:family_members!tasks_owner_id_fkey(id, display_name, color),
      project:projects(id, name, color)
    `)
    .is('completed_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Tasks list error:', error)
    return NextResponse.json({ error: error.message, tasks: [] }, { status: 500 })
  }
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    // Accept either field name from older clients
    const owner_id  = body.owner_id ?? body.member_id
    const text      = (body.text ?? '').toString().trim()
    const due_date  = body.due_date || null
    let project_id  = body.project_id || null
    const creator_id = body.creator_id ?? owner_id  // default: creator = owner

    if (!owner_id || !text) {
      return NextResponse.json({ error: 'owner_id and text required' }, { status: 400 })
    }

    if (!project_id) {
      project_id = await getOrCreatePersonalProject(owner_id)
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        owner_id,
        creator_id,
        project_id,
        text,
        due_date,
      })
      .select(`
        id, text, due_date, completed_at, created_at, owner_id, creator_id, project_id, pinned,
        owner:family_members!tasks_owner_id_fkey(id, display_name, color),
        project:projects(id, name, color)
      `)
      .single()
    if (error) {
      console.error('Task create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ task: data })
  } catch (err: any) {
    console.error('Task create error:', err)
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
