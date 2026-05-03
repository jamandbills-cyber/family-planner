'use client'

import { createBrowserClient } from '@supabase/ssr'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — use in 'use client' components only
export function getSupabaseBrowser() {
  return createBrowserClient(url, anonKey)
}
