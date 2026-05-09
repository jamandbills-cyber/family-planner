'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

type Role = 'admin' | 'member' | null

// Routes that should NOT show any nav at all
// (login, device-token displays, tokenized forms)
const HIDDEN_ON = ['/login', '/d/', '/form/']

// Routes that belong to the OLD admin app (Sunday Planning).
// These keep the original Setup / Meeting / Plan footer.
const SUNDAY_PLANNING_ROUTES = ['/admin'] // exact /admin and the /meeting, /plan sub-views

const Icon = {
  Home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />
    </svg>
  ),
  User: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
    </svg>
  ),
  Settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ClipboardList: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  ),
}

export default function NavBar() {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [role, setRole] = useState<Role>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAuthChecked(true); return }
      const { data: member } = await supabase
        .from('family_members')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()
      setRole((member?.role as Role) ?? null)
      setAuthChecked(true)
    })
  }, [pathname])

  // Don't render on login, device displays, or tokenized forms
  if (HIDDEN_ON.some(p => pathname.startsWith(p))) return null

  // For Sunday Planning routes (/admin exact, /meeting, /plan), show the OLD nav
  // those pages depend on. Only the dashboard side gets the new nav.
  const isSundayPlanningPage =
    pathname === '/admin' ||
    pathname.startsWith('/meeting') ||
    pathname.startsWith('/plan')

  if (isSundayPlanningPage) {
    return <SundayPlanningNav pathname={pathname} />
  }

  // For Supabase-authed pages, show the new role-aware nav.
  // If we don't know the user yet, render nothing to avoid flicker.
  if (!authChecked) return null
  if (!role) return null

  return <DashboardNav pathname={pathname} role={role} onLogout={async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }} />
}

// ─── Dashboard nav (Supabase auth) ────────────────────────────
function DashboardNav({ pathname, role, onLogout }: {
  pathname: string; role: 'admin' | 'member'; onLogout: () => void
}) {
  const items: Array<{ href: string; label: string; icon: React.ReactNode; active: boolean }> = [
    { href: '/dashboard', label: 'Dashboard', icon: Icon.Home, active: pathname === '/dashboard' },
    { href: '/profile',   label: 'Profile',   icon: Icon.User, active: pathname === '/profile' },
  ]

  if (role === 'admin') {
    items.push({
      href: '/manage', label: 'Manage', icon: Icon.Settings,
      active: pathname.startsWith('/manage') || pathname.startsWith('/admin/family')
              || pathname.startsWith('/admin/projects') || pathname.startsWith('/admin/devices')
              || pathname.startsWith('/admin/tasks') || pathname.startsWith('/admin/ideas')
              || pathname.startsWith('/admin/photos'),
    })
    items.push({
      href: '/admin?from=dashboard', label: 'Sunday Plan', icon: Icon.Calendar, active: false,
    })
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#1A1A2E', borderTop: '1px solid #2A2A3E',
      padding: '10px 8px', display: 'flex', justifyContent: 'space-around',
      alignItems: 'center', zIndex: 100,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
    }}>
      {items.map(item => (
        <Link key={item.href} href={item.href}
          style={{
            flex: 1, textAlign: 'center', textDecoration: 'none',
            color: item.active ? '#FFE7DA' : '#7070A0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 4px', fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, fontWeight: item.active ? 600 : 400,
          }}>
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
      <button onClick={onLogout}
        style={{
          flex: 1, background: 'none', border: 'none', cursor: 'pointer',
          color: '#7070A0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 3, padding: '6px 4px',
          fontFamily: "'DM Sans', sans-serif", fontSize: 11,
        }}>
        {Icon.Logout}
        <span>Sign out</span>
      </button>
    </nav>
  )
}

// ─── Sunday Planning nav (existing app, Google auth) ──────────
function SundayPlanningNav({ pathname }: { pathname: string }) {
  const items = [
    { href: '/admin',    label: 'Setup',   icon: Icon.Settings,      active: pathname === '/admin' },
    { href: '/meeting',  label: 'Meeting', icon: Icon.Users,         active: pathname.startsWith('/meeting') },
    { href: '/plan',     label: 'Plan',    icon: Icon.ClipboardList, active: pathname.startsWith('/plan') },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#1A1A2E', borderTop: '1px solid #2A2A3E',
      padding: '10px 8px', display: 'flex', justifyContent: 'space-around',
      alignItems: 'center', zIndex: 100,
    }}>
      {items.map(item => (
        <Link key={item.href} href={item.href}
          style={{
            flex: 1, textAlign: 'center', textDecoration: 'none',
            color: item.active ? '#FFE7DA' : '#7070A0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 4px', fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, fontWeight: item.active ? 600 : 400,
          }}>
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
      <Link href="/dashboard" style={{
        flex: 1, textAlign: 'center', textDecoration: 'none', color: '#7070A0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '6px 4px', fontFamily: "'DM Sans', sans-serif", fontSize: 11,
      }}>
        {Icon.Home}
        <span>Dashboard</span>
      </Link>
    </nav>
  )
}
