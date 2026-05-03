import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase'
import DevicesAdminClient from './DevicesAdminClient'

export default async function AdminDevicesPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('family_members')
    .select('role').eq('auth_user_id', user.id).single()

  if (!me || me.role !== 'admin') {
    return (
      <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
        Admins only.
      </div>
    )
  }

  const { data: devices } = await supabase.from('device_tokens')
    .select('*').order('created_at', { ascending: false })

  const { data: members } = await supabase.from('family_members')
    .select('id, display_name').order('display_name')

  return <DevicesAdminClient
    initialDevices={devices ?? []}
    members={members ?? []} />
}
