import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase'
import ProjectsAdminClient from './ProjectsAdminClient'
import { AuthedLayout } from '@/lib/AuthedLayout'

export default async function AdminProjectsPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('family_members')
    .select('id, role').eq('auth_user_id', user.id).single()

  if (!me || me.role !== 'admin') {
    return (
      <AuthedLayout>
        <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
          Admins only.
        </div>
      </AuthedLayout>
    )
  }

  const { data: members } = await supabase.from('family_members')
    .select('id, display_name, color').order('display_name')

  const { data: projects } = await supabase.from('projects')
    .select('*').eq('status', 'active').order('name')

  const projectIds = (projects ?? []).map(p => p.id)

  const { data: tasks } = projectIds.length > 0
    ? await supabase.from('tasks')
        .select('*')
        .in('project_id', projectIds)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <AuthedLayout>
      <ProjectsAdminClient
        initialProjects={projects ?? []}
        initialTasks={tasks ?? []}
        members={members ?? []}
      />
    </AuthedLayout>
  )
}
