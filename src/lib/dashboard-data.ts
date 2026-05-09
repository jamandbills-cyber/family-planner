import 'server-only'
import { getSupabaseAdmin } from './supabase'
import { fetchWeekCalendar } from './dashboard-calendar'
import type { FamilyMember, Project, Task, Idea } from './types/dashboard'
import type { WeekRange } from './types/calendar'

export type DashboardData = {
  member: FamilyMember
  projects: (Project & { tasks: Task[] })[]
  ideas: Idea[]
  calendar: WeekRange | null
  members: { id: string; display_name: string; color: string | null }[]
}

async function safeFetchCalendar(): Promise<WeekRange | null> {
  try {
    return await fetchWeekCalendar(0)
  } catch (err: any) {
    console.error('Calendar fetch failed:', err?.message ?? err)
    return null
  }
}

export async function getKitchenColumns() {
  const supabase = getSupabaseAdmin()
  const { data: members } = await supabase
    .from('family_members')
    .select('id, display_name, color, type')
    .order('type', { ascending: false })
    .order('display_name')

  if (!members) return null

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
    ideas: (allIdeas ?? []).filter(i => i.owner_id === m.id),
  }))

  return {
    columns,
    members: members.map(m => ({ id: m.id, display_name: m.display_name, color: m.color })),
  }
}

export async function getDashboardForMember(memberId: string): Promise<DashboardData | null> {
  const supabase = getSupabaseAdmin()

  const { data: member } = await supabase
    .from('family_members')
    .select('id, username, email, display_name, type, role, phone, color, can_drive, ics_feeds, auth_user_id, created_at, updated_at')
    .eq('id', memberId)
    .single()
  if (!member) return null

  const [
    { data: projects },
    { data: ideas },
    { data: members },
    calendar,
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, color, owner_id, status, is_shared, created_at, updated_at')
      .or(`owner_id.eq.${memberId},is_shared.eq.true`)
      .eq('status', 'active')
      .order('is_shared', { ascending: true })
      .order('name'),
    supabase
      .from('ideas')
      .select('id, text, owner_id, creator_id, project_id, is_shared, created_at')
      .eq('owner_id', memberId)
      .order('created_at', { ascending: false }),
    supabase
      .from('family_members')
      .select('id, display_name, color'),
    safeFetchCalendar(),
  ])

  const projectIds = (projects ?? []).map(p => p.id)

  const { data: tasks } = projectIds.length > 0
    ? await supabase
        .from('tasks')
        .select('id, project_id, text, owner_id, creator_id, due_date, pinned, completed_at, created_at, updated_at, position')
        .in('project_id', projectIds)
        .is('completed_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
    : { data: [] }

  const projectsWithTasks = (projects ?? []).map(p => ({
    ...p,
    tasks: (tasks ?? []).filter(t => {
      if (t.project_id !== p.id) return false
      if (!p.is_shared) return true
      return t.owner_id === memberId
    }),
  }))

  return {
    member,
    projects: projectsWithTasks,
    ideas: ideas ?? [],
    calendar,
    members: members ?? [],
  }
}

export async function getKitchenData() {
  const kitchen = await getKitchenColumns()
  if (!kitchen) return null

  const calendar = await safeFetchCalendar()

  return {
    columns: kitchen.columns,
    calendar,
    members: kitchen.members,
  }
}
