import { redirect } from 'next/navigation'
import { getCurrentMember } from '@/lib/auth-helpers'

// Wraps a Supabase-authed page. Redirects to /login if not signed in.
// The nav is rendered by the root layout's NavBar, not here, so this
// component is purely an auth gate plus passthrough.
export async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember()
  if (!member) redirect('/login')

  return <>{children}</>
}
