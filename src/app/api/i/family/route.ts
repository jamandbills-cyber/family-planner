import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceToken } from '@/lib/device-token'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('d')
  const auth = await validateDeviceToken(token)
  if (!auth.valid) {
    return NextResponse.json({ error: 'Invalid device' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('family_members')
    .select('id, display_name, color, type')
    .order('display_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message, members: [] }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}
