import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Public polling endpoint for the kitchen TV.
// Returns family columns (per-member tasks/ideas) and the members list.
// No auth — same trust model as /api/dashboard/calendar.
export async function GET() {
  const supabase = getSupabaseAdmin()

  const { data: members } = await supabase
    .from('family_members')
    .select('id, display_name, color, type')
    .order('type', { ascending: false })
    .order('display_name')

  if (!members) {
    return NextResponse.json({ columns: [], members: [], syncedAt: new Date().toISOString() })
  }

  const [{ data: allTasks }, { data: allIdeas }, { data: projects }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, owner_id, text, due_date, project_id')
      .is('completed_at', null),
    supabase
      .from('ideas')
      .select('id, owner_id, text'),
    supabase
      .from('projects')
      .select('id, name, color')
      .eq('status', 'active'),
  ])

  const projectMap = new Map((projects ?? []).map(p => [p.id, p]))

  const columns = members.map(m => ({
    member: m,
    tasks: (allTasks ?? [])
      .filter(t => t.owner_id === m.id)
      .map(t => ({
        id: t.id,
        text: t.text,
        due_date: t.due_date,
        project: t.project_id ? projectMap.get(t.project_id) ?? null : null,
      })),
    ideas: (allIdeas ?? [])
      .filter(i => i.owner_id === m.id)
      .map(i => ({ id: i.id, text: i.text })),
  }))

  return NextResponse.json({
    columns,
    members: members.map(m => ({ id: m.id, display_name: m.display_name, color: m.color })),
    syncedAt: new Date().toISOString(),
  })
}
