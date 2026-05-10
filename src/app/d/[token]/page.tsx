import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getDashboardForMember } from '@/lib/dashboard-data'
import { getHouseholdDisplayData } from '@/lib/dashboard-display'
import KitchenDashboard from '@/lib/KitchenDashboard'
import KitchenDashboardPortrait from '@/lib/KitchenDashboardPortrait'
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
    .select('view_type, orientation, member_id, label')
    .eq('token', token)
    .eq('revoked', false)
    .maybeSingle()

  if (!device) notFound()

  const orientation: 'landscape' | 'portrait' = device.orientation === 'portrait' ? 'portrait' : 'landscape'

  if (device.view_type === 'kitchen') {
    const data = await getHouseholdDisplayData()
    if (orientation === 'portrait') {
      return (
        <KitchenDashboardPortrait
          initialData={data}
          deviceToken={token}
        />
      )
    }
    return (
      <KitchenDashboard
        initialData={data}
        deviceToken={token}
      />
    )
  }

  // personal — landscape only for now
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
