import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { username } = await req.json()
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: member } = await admin
    .from('family_members')
    .select('email')
    .eq('username', username.toLowerCase())
    .single()

  if (!member) {
    // Don't leak whether the username exists
    return NextResponse.json({ ok: true })
  }

  const supabase = await getSupabaseServer()
  const redirectBase = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const { error } = await supabase.auth.signInWithOtp({
    email: member.email,
    options: { emailRedirectTo: `${redirectBase}/profile` },
  })

  if (error) {
    console.error('Magic link error:', error)
    return NextResponse.json({ error: 'Failed to send link' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
