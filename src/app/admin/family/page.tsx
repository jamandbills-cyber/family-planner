import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase'
import FamilyAdminClient from './FamilyAdminClient'
import { AuthedLayout } from '@/lib/AuthedLayout'

export default async function FamilyAdminPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('family_members')
    .select('role').eq('auth_user_id', user.id).single()

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
    .select('id, username, email, display_name, type, role, phone, color, can_drive, ics_feeds, auth_user_id, created_at, updated_at')
    .order('type', { ascending: false })
    .order('display_name')

  return (
    <AuthedLayout>
      <FamilyAdminClient initialMembers={members ?? []} />
    </AuthedLayout>
  )
}
