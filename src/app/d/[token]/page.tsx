import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardForMember, getKitchenData } from '@/lib/dashboard-data'
import PersonalDashboard from '@/lib/PersonalDashboard'
import KitchenDashboard from '@/lib/KitchenDashboard'

// Disable caching so the dashboard always shows fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Params = { params: Promise<{ token: string }> }

export default async function DeviceDashboardPage({ params }: Params) {
  const { token } = await params

  const supabase = getSupabaseAdmin()
  const { data: device } = await supabase
    .from('device_tokens')
    .select('*')
    .eq('token', token)
    .eq('revoked', false)
    .single()

  if (!device) {
    return (
      <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif",
                    background: '#1A1A2E', color: '#fff', minHeight: '100vh' }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Device not authorized</h1>
        <p style={{ fontSize: 14, color: '#8B8599' }}>
          This URL is invalid or has been revoked. Ask an admin for a new device URL.
        </p>
      </div>
    )
  }

  // Touch last_seen_at so admins can see when devices last connected
  await supabase
    .from('device_tokens')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('token', token)

  if (device.view_type === 'kitchen') {
    const data = await getKitchenData()
    if (!data) return <div style={{ padding: 40 }}>Could not load kitchen data.</div>
    return <KitchenDashboard {...data} />
  }

  if (device.view_type === 'personal' && device.member_id) {
    const data = await getDashboardForMember(device.member_id)
    if (!data) return <div style={{ padding: 40 }}>Could not load member data.</div>
    return <PersonalDashboard {...data} />
  }

  return (
    <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
      Unknown view type. Ask an admin to fix this device.
    </div>
  )
}
