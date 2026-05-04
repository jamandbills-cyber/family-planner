import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getKitchenData, getDashboardForMember } from '@/lib/dashboard-data'
import KitchenDashboard from '@/lib/KitchenDashboard'
import PersonalDashboard from '@/lib/PersonalDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DevicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = getSupabaseAdmin()
  const { data: device } = await supabase
    .from('device_tokens')
    .select('view_type, member_id, label')
    .eq('token', token)
    .maybeSingle()

  if (!device) notFound()

  if (device.view_type === 'kitchen') {
    const data = await getKitchenData()
    if (!data) notFound()
    return (
      <KitchenDashboard
        columns={data.columns}
        calendar={data.calendar}
        members={data.members}
        deviceToken={token}
      />
    )
  }

  // personal
  if (!device.member_id) notFound()
  const data = await getDashboardForMember(device.member_id)
  if (!data) notFound()
  return (
    <PersonalDashboard
      member={data.member}
      projects={data.projects}
      ideas={data.ideas}
      calendar={data.calendar}
      members={data.members}
    />
  )
}
