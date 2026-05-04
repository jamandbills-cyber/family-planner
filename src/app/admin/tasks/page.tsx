import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import TasksClient from './TasksClient'

export default async function TasksPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/api/auth/signin')
  return <TasksClient />
}
