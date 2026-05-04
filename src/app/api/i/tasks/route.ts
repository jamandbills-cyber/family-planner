import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceToken } from '@/lib/device-token'
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
  if (error) throw new Error(`Personal project: ${error.message}`)
  return created.id
}

// GET /api/i/tasks?d={token}&member_id={id}
// Lists open tasks for a single member, ordered by position.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('d')
  const memberId = req.nextUrl.searchParams.get('member_id')
  const auth = await validateDeviceToken(token)
  if (!auth.valid) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })
  if (!memberId)   return NextResponse.json({ error: 'member_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tasks')
    .select('id, text, due_date, completed_at, created_at, position, member_id, project_id')
    .eq('member_id', memberId)
    .is('completed_at', null)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message, tasks: [] }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [] })
}

// POST /api/i/tasks?d={token}
// Creates a task at the end of the member's list (max position + 1000).
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('d')
  const auth = await validateDeviceToken(token)
  if (!auth.valid) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })

  try {
    const body = await req.json()
    const memberId = body.member_id
    const text = (body.text ?? '').toString().trim()
    if (!memberId || !text) {
      return NextResponse.json({ error: 'member_id and text required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Compute next position: max + 1000 for this member, or 1000 if first task
    const { data: maxRow } = await supabase
      .from('tasks')
      .select('position')
      .eq('member_id', memberId)
      .order('position', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    const nextPosition = (maxRow?.position ?? 0) + 1000

    const project_id = await getOrCreatePersonalProject(memberId)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        member_id: memberId,
        project_id,
        text,
        position: nextPosition,
      })
      .select('id, text, due_date, completed_at, created_at, position, member_id, project_id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
