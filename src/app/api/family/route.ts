import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// Returns family roster in the existing shape so the existing admin/forms
// flow keeps working unchanged. Reads from Supabase instead of the sheet.
export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('family_members')
    .select('id, username, email, display_name, type, role, phone, color, can_drive, ics_feeds')
    .order('type', { ascending: false }) // adults first
    .order('display_name')

  if (error) {
    console.error('Family fetch error:', error)
    return NextResponse.json({ error: 'Failed to load family' }, { status: 500 })
  }

  const members = (data ?? []).map(m => ({
    id: m.id,
    name: m.display_name,
    type: m.type,
    phone: m.phone ?? '',
    email: m.email,
    color: m.color ?? '',
    canDrive: m.can_drive,
  }))

  return NextResponse.json({ members })
}
