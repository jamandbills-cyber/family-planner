import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase'
import { getDashboardForMember } from '@/lib/dashboard-data'
import PersonalDashboard from '@/lib/PersonalDashboard'

export default async function DashboardPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('family_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!me) {
    return (
      <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
        No family member linked to this account. Ask an admin to add you to the roster.
      </div>
    )
  }

  const data = await getDashboardForMember(me.id)
  if (!data) {
    return (
      <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
        Could not load dashboard data.
      </div>
    )
  }

  return <PersonalDashboard {...data} />
}
