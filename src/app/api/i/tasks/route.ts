import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceToken } from '@/lib/device-token'
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

// GET /api/i/tasks?d={token}&owner_id={id} (also accepts member_id legacy)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('d')
  const ownerId = req.nextUrl.searchParams.get('owner_id')
                ?? req.nextUrl.searchParams.get('member_id')
  const auth = await validateDeviceToken(token)
  if (!auth.valid) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })
  if (!ownerId)    return NextResponse.json({ error: 'owner_id required' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tasks')
    .select('id, text, due_date, completed_at, created_at, position, owner_id, creator_id, project_id')
    .eq('owner_id', ownerId)
    .is('completed_at', null)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message, tasks: [] }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('d')
  const auth = await validateDeviceToken(token)
  if (!auth.valid) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })

  try {
    const body = await req.json()
    const owner_id   = body.owner_id ?? body.member_id
    const text       = (body.text ?? '').toString().trim()
    const creator_id = body.creator_id ?? owner_id

    if (!owner_id || !text) {
      return NextResponse.json({ error: 'owner_id and text required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: maxRow } = await supabase
      .from('tasks')
      .select('position')
      .eq('owner_id', owner_id)
      .order('position', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    const nextPosition = (maxRow?.position ?? 0) + 1000

    const project_id = await getOrCreatePersonalProject(owner_id)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        owner_id,
        creator_id,
        project_id,
        text,
        position: nextPosition,
      })
      .select('id, text, due_date, completed_at, created_at, position, owner_id, creator_id, project_id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
