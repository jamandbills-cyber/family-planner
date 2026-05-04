import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceToken } from '@/lib/device-token'
import { getSupabaseAdmin } from '@/lib/supabase'

// PATCH /api/i/tasks/[id]?d={token}
// Body can include:
//   - completed: true → mark complete
//   - text: string → edit text
//   - move: 'up' | 'down' → swap position with neighbor
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.nextUrl.searchParams.get('d')
  const auth = await validateDeviceToken(token)
  if (!auth.valid) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    // Move up/down — swap positions with the adjacent task
    if (body.move === 'up' || body.move === 'down') {
      const { data: self } = await supabase
        .from('tasks')
        .select('id, member_id, position')
        .eq('id', id)
        .maybeSingle()
      if (!self) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

      const direction = body.move === 'up' ? 'desc' : 'asc'
      const cmp = body.move === 'up' ? 'lt' : 'gt'

      const query = supabase
        .from('tasks')
        .select('id, position')
        .eq('member_id', self.member_id)
        .is('completed_at', null)
        .order('position', { ascending: direction === 'asc', nullsFirst: false })
        .limit(1)

      const { data: neighborArr } = await (cmp === 'lt'
        ? query.lt('position', self.position)
        : query.gt('position', self.position))

      const neighbor = neighborArr?.[0]
      if (!neighbor) {
        // Already at top/bottom — no-op
        return NextResponse.json({ task: self, moved: false })
      }

      // Swap
      await supabase.from('tasks').update({ position: self.position }).eq('id', neighbor.id)
      const { data: updated, error } = await supabase
        .from('tasks')
        .update({ position: neighbor.position })
        .eq('id', id)
        .select('id, text, due_date, completed_at, created_at, position, member_id, project_id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ task: updated, moved: true })
    }

    // Regular field updates
    const update: Record<string, any> = {}
    if (body.text !== undefined)      update.text = body.text
    if (body.due_date !== undefined)  update.due_date = body.due_date || null
    if (body.completed !== undefined) update.completed_at = body.completed ? new Date().toISOString() : null
    if (body.position !== undefined)  update.position = body.position

    const { data, error } = await supabase
      .from('tasks')
      .update(update)
      .eq('id', id)
      .select('id, text, due_date, completed_at, created_at, position, member_id, project_id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.nextUrl.searchParams.get('d')
  const auth = await validateDeviceToken(token)
  if (!auth.valid) return NextResponse.json({ error: 'Invalid device' }, { status: 401 })

  const { id } = await params
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
