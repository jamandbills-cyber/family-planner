import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFamilyMembers } from '@/lib/sheets'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const members = await getFamilyMembers(session.accessToken)
    return NextResponse.json({ members })
  } catch (err) {
    console.error('Family fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 })
  }
}
