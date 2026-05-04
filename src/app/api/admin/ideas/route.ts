import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('ideas')
    .select(`
      id, text, created_at, member_id,
      member:family_members(id, display_name, color)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ideas: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { member_id, text } = body
    if (!member_id || !text?.trim()) {
      return NextResponse.json({ error: 'member_id and text required' }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('ideas')
      .insert({ member_id, text: text.trim() })
      .select(`
        id, text, created_at, member_id,
        member:family_members(id, display_name, color)
      `)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ idea: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
