import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireAdminMember } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

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

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Real schema (Nov 2025):
//   id            text NOT NULL
//   username      text NOT NULL
//   email         text NOT NULL
//   display_name  text NOT NULL
//   type          text NOT NULL    ← NOT member_type
//   role          text NOT NULL
//   phone         text NULL
//   color         text NULL
//   can_drive     boolean NOT NULL
//   ics_feeds     text[] NULL
//   auth_user_id  uuid NULL
export async function POST(req: NextRequest) {
  const auth = await requireAdminMember()
  if (auth.response) return auth.response

  try {
    const body = await req.json()
    const display_name = (body.display_name ?? body.name ?? '').toString().trim()
    if (!display_name) {
      return NextResponse.json({ error: 'display_name required' }, { status: 400 })
    }

    const id = (body.id ?? slugify(display_name)).toString()

    // Defaults for NOT NULL columns so the insert can't fail on missing fields
    const insert: Record<string, any> = {
      id,
      display_name,
      username:  (body.username ?? id).toString(),
      email:     (body.email ?? '').toString(),
      type:      (body.type ?? body.member_type ?? 'adult').toString(),
      role:      (body.role ?? 'member').toString(),
      can_drive: body.can_drive ?? body.canDrive ?? false,
    }

    // Optional columns — only set if provided
    if (body.phone !== undefined && body.phone !== null) {
      insert.phone = body.phone.toString()
    }
    if (body.color !== undefined && body.color !== null) {
      insert.color = body.color.toString()
    }
    if (body.ics_feeds !== undefined && body.ics_feeds !== null) {
      insert.ics_feeds = body.ics_feeds
    }
    if (body.auth_user_id !== undefined && body.auth_user_id !== null) {
      insert.auth_user_id = body.auth_user_id
    }

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
