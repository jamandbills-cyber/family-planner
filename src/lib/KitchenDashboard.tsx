'use client'

import HouseholdDisplay from '@/lib/HouseholdDisplay'
import type { HouseholdDisplayData } from '@/lib/types/display'

type Props = {
  initialData: HouseholdDisplayData
  deviceToken?: string
}

export default function KitchenDashboard({ initialData, deviceToken }: Props) {
  return (
    <HouseholdDisplay
      initialData={initialData}
      orientation="landscape"
      deviceToken={deviceToken}
    />
  )
}
