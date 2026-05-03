import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase'
import FamilyAdminClient from './FamilyAdminClient'

export default async function FamilyAdminPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('family_members')
    .select('role').eq('auth_user_id', user.id).single()

  if (me?.role !== 'admin') {
    return (
      <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
        Admins only.
      </div>
    )
  }

  const { data: members } = await supabase.from('family_members')
    .select('*').order('type', { ascending: false }).order('display_name')

  return <FamilyAdminClient initialMembers={members ?? []} />
}
