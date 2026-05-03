import 'server-only'
import { getSupabaseServer } from './supabase'

export type CurrentMember = {
  id: string
  username: string
  display_name: string
  role: 'admin' | 'member'
}

// Fetch the currently logged-in family member (if any).
// Returns null if not signed in or if the auth user has no member row.
// Used by server components and layouts to render role-aware UI.
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('family_members')
    .select('id, username, display_name, role')
    .eq('auth_user_id', user.id)
    .single()

  return member ?? null
}
