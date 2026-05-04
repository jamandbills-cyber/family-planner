'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

type NavRole = 'admin' | 'member'

type Props = {
  role: NavRole
  currentMemberDisplayName?: string
}

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
  Checklist: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

export default function BottomNav({ role }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const items: Array<{
    href: string; label: string; icon: React.ReactNode;
    active: boolean; external?: boolean
  }> = [
    {
      href: '/dashboard', label: 'Dashboard', icon: Icon.Home,
      active: pathname === '/dashboard',
    },
    {
      href: '/profile', label: 'Profile', icon: Icon.User,
      active: pathname === '/profile',
    },
  ]

  if (role === 'admin') {
    // Manage covers /manage and admin sub-pages that don't have their own tab
    items.push({
      href: '/manage', label: 'Manage', icon: Icon.Settings,
      active: pathname.startsWith('/manage')
              || pathname.startsWith('/admin/family')
              || pathname.startsWith('/admin/projects')
              || pathname.startsWith('/admin/devices')
              || pathname.startsWith('/admin/ideas')
              || pathname.startsWith('/admin/photos'),
    })
    // Tasks gets its own tab — used frequently enough for one-tap access
    items.push({
      href: '/admin/tasks', label: 'Tasks', icon: Icon.Checklist,
      active: pathname.startsWith('/admin/tasks'),
    })
    items.push({
      href: '/admin?from=dashboard', label: 'Sunday Plan', icon: Icon.Calendar,
      active: false, external: true,
    })
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
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
      <button onClick={logout}
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
