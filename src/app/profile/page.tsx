import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase'
import ProfileClient from './ProfileClient'
import { AuthedLayout } from '@/lib/AuthedLayout'

export default async function ProfilePage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('family_members')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!member) {
    return (
      <AuthedLayout>
        <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
          No family member linked to this account. Ask an admin to add you to the roster.
        </div>
      </AuthedLayout>
    )
  }

  return (
    <AuthedLayout>
      <ProfileClient member={member} />
    </AuthedLayout>
  )
}
