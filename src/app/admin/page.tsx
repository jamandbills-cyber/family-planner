'use server'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import AdminSetupClient from './AdminSetupClient'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  // Not signed in → go to sign-in page
  if (!session) {
    redirect('/api/auth/signin')
  }

  return <AdminSetupClient />
}
