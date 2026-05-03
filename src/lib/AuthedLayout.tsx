import { redirect } from 'next/navigation'
import { getCurrentMember } from '@/lib/auth-helpers'
import BottomNav from '@/lib/BottomNav'

// Wraps any page that should show the bottom nav and require Supabase login.
// Used by /dashboard, /profile, and /manage/* pages.
export async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember()
  if (!member) redirect('/login')

  return (
    <div style={{ paddingBottom: 80, minHeight: '100vh' }}>
      {children}
      <BottomNav role={member.role} />
    </div>
  )
}
