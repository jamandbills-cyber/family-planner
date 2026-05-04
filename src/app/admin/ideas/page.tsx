import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import IdeasClient from './IdeasClient'

export default async function IdeasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/api/auth/signin')
  return <IdeasClient />
}
