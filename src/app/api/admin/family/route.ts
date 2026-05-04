import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Returns family members from Supabase, used by all admin pages.
// IDs here match the FKs in tasks/ideas/projects/device_tokens.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .order('display_name', { ascending: true })

  if (error) {
    console.error('Family list error:', error)
    return NextResponse.json({ error: error.message, members: [] }, { status: 500 })
  }
  return NextResponse.json({ members: data ?? [] })
}
