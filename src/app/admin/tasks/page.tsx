import { redirect } from 'next/navigation'
import { getCurrentMember } from '@/lib/auth-helpers'
import { AuthedLayout } from '@/lib/AuthedLayout'
import TasksClient from './TasksClient'

export default async function TasksPage() {
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

  return <TasksClient />
}
