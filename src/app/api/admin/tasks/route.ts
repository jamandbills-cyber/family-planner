import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getOrCreatePersonalProject(memberId: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('member_id', memberId)
    .ilike('name', 'Personal')
    .maybeSingle()
  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('projects')
    .insert({ member_id: memberId, name: 'Personal', color: null })
    .select('id')
    .single()
  if (error) throw new Error(`Could not create Personal project: ${error.message}`)
  return created.id
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id, text, due_date, completed_at, created_at, member_id, project_id,
      member:family_members(id, display_name, color),
      project:projects(id, name, color)
    `)
    .is('completed_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Tasks list error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { member_id, text, due_date, project_id } = body
    if (!member_id || !text?.trim()) {
      return NextResponse.json({ error: 'member_id and text required' }, { status: 400 })
    }

    let pid: string = project_id || ''
    if (!pid) {
      pid = await getOrCreatePersonalProject(member_id)
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        member_id,
        project_id: pid,
        text: text.trim(),
        due_date: due_date || null,
      })
      .select(`
        id, text, due_date, completed_at, created_at, member_id, project_id,
        member:family_members(id, display_name, color),
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
