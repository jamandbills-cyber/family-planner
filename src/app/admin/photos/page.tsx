import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import PhotosClient from './PhotosClient'

export default async function PhotosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/api/auth/signin')
  return <PhotosClient />
}
