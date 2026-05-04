import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// List all family members
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

// Create a new family member.
// Accepts a flexible body — only `display_name` is required.
// `id` is optional; if omitted, we slugify the display name.
function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const display_name = (body.display_name ?? body.name ?? '').toString().trim()
    if (!display_name) {
      return NextResponse.json({ error: 'display_name required' }, { status: 400 })
    }

    const id = (body.id ?? slugify(display_name)).toString()
    const color = body.color ?? null
    const member_type = body.member_type ?? body.type ?? null
    const can_drive = body.can_drive ?? body.canDrive ?? null
    const phone = body.phone ?? null
    const email = body.email ?? null

    // Build insert object with only fields that were actually provided —
    // avoids inserting null into NOT NULL columns we don't know about.
    const insert: Record<string, any> = { id, display_name }
    if (color !== null)       insert.color = color
    if (member_type !== null) insert.member_type = member_type
    if (can_drive !== null)   insert.can_drive = can_drive
    if (phone !== null)       insert.phone = phone
    if (email !== null)       insert.email = email

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('family_members')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('Family create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ member: data })
  } catch (err: any) {
    console.error('Family create error:', err)
    return NextResponse.json({ error: err?.message ?? 'Failed' }, { status: 500 })
  }
}
