import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getCurrentMember } from '@/lib/auth-helpers'
import { AuthedLayout } from '@/lib/AuthedLayout'
import AdminSetupClient from './AdminSetupClient'

export default async function AdminPage() {
  const me = await getCurrentMember()
  if (!me) redirect('/login')

  if (me.role !== 'admin') {
    return (
      <AuthedLayout>
        <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
          Admins only.
        </div>
      </AuthedLayout>
    )
  }

  const session = await getServerSession(authOptions)

  // Sunday planning still needs Google OAuth for Calendar/Sheets/Gmail access.
  if (!session) {
    redirect('/api/auth/signin')
  }

  return <AdminSetupClient />
}
