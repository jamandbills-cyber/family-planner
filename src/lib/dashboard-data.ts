import 'server-only'
import { getSupabaseAdmin } from './supabase'
import type { FamilyMember, Project, Task, Idea } from './types/dashboard'

export type DashboardData = {
  member: FamilyMember
  projects: (Project & { tasks: Task[] })[]
  ideas: Idea[]
}

// Build dashboard data for one family member.
// Used by both logged-in /dashboard and tokenized /d/[token] routes.
export async function getDashboardForMember(memberId: string): Promise<DashboardData | null> {
  const supabase = getSupabaseAdmin()

  const { data: member } = await supabase
    .from('family_members')
    .select('*')
    .eq('id', memberId)
    .single()

  if (!member) return null

  // Their own projects + all shared projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .or(`owner_id.eq.${memberId},is_shared.eq.true`)
    .eq('status', 'active')
    .order('is_shared', { ascending: true })
    .order('name')

  const projectIds = (projects ?? []).map(p => p.id)

  const { data: tasks } = projectIds.length > 0
    ? await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds)
        .is('completed_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
    : { data: [] }

  // Group tasks by project. For shared projects, only show this member's tasks.
  const projectsWithTasks = (projects ?? []).map(p => ({
    ...p,
    tasks: (tasks ?? []).filter(t => {
      if (t.project_id !== p.id) return false
      // For private projects, all tasks are mine
      if (!p.is_shared) return true
      // For shared projects, only show tasks owned by this member
      return t.owner_id === memberId
    }),
  }))

  const { data: ideas } = await supabase
    .from('ideas')
    .select('*')
    .eq('owner_id', memberId)
    .order('created_at', { ascending: false })

  return {
    member,
    projects: projectsWithTasks,
    ideas: ideas ?? [],
  }
}

// Build kitchen view: every member with their open task count and ideas
export async function getKitchenData() {
  const supabase = getSupabaseAdmin()

  const { data: members } = await supabase
    .from('family_members')
    .select('*')
    .order('type', { ascending: false })
    .order('display_name')

  if (!members) return null

  const { data: allTasks } = await supabase
    .from('tasks')
    .select('id, owner_id, text, due_date, project_id')
    .is('completed_at', null)

  const { data: allIdeas } = await supabase
    .from('ideas')
    .select('id, owner_id, text')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, color')
    .eq('status', 'active')

  const projectMap = new Map((projects ?? []).map(p => [p.id, p]))

  const columns = members.map(m => ({
    member: m,
    tasks: (allTasks ?? [])
      .filter(t => t.owner_id === m.id)
      .map(t => ({
        ...t,
        project: t.project_id ? projectMap.get(t.project_id) ?? null : null,
      })),
    ideas: (allIdeas ?? []).filter(i => i.owner_id === m.id),
  }))

  return { columns }
}
