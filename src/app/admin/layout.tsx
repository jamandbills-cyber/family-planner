import { Suspense } from 'react'
import SundayPlanBanner from '@/lib/SundayPlanBanner'

// Wraps all /admin/* pages with a one-time banner.
// The banner only shows when the URL has ?from=dashboard.
// New Supabase-authed admin pages (/admin/family, /admin/projects, /admin/devices)
// won't have that query param so the banner stays hidden there.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <SundayPlanBanner />
      </Suspense>
      {children}
    </>
  )
}
