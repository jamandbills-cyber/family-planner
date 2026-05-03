import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  // Look up email by username
  const admin = getSupabaseAdmin()
  const { data: member } = await admin
    .from('family_members')
    .select('email')
    .eq('username', username.toLowerCase())
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  // Sign in with Supabase Auth via server client (writes session cookie)
  const supabase = await getSupabaseServer()
  const { error } = await supabase.auth.signInWithPassword({
    email: member.email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
