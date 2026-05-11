'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

type Role = 'admin' | 'member' | null
type NavItem = {
  href: string
  label: string
  shortLabel?: string
  icon: React.ReactNode
  active: (pathname: string) => boolean
}
type NavGroup = {
  label: string
  items: NavItem[]
  adminOnly?: boolean
}

// Routes that should NOT show any nav at all
// (login/auth, device-token displays, tokenized forms, task kiosks)
const HIDDEN_ON = ['/login', '/auth', '/d/', '/form/', '/i/', '/privacy', '/terms']

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
  Checklist: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Lightbulb: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.74V16h8v-1.26A7 7 0 0 0 12 2z" />
    </svg>
  ),
  Image: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  Screen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  ),
}

const navGroups: NavGroup[] = [
  {
    label: 'Daily',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Icon.Home, active: p => p === '/dashboard' },
      { href: '/plan', label: 'Live Plan', shortLabel: 'Plan', icon: Icon.ClipboardList, active: p => p.startsWith('/plan') },
      { href: '/profile', label: 'Profile', icon: Icon.User, active: p => p === '/profile' },
    ],
  },
  {
    label: 'Manage',
    adminOnly: true,
    items: [
      { href: '/manage', label: 'Manage Home', shortLabel: 'Manage', icon: Icon.Settings, active: p => p === '/manage' },
      { href: '/admin/tasks', label: 'Tasks', icon: Icon.Checklist, active: p => p.startsWith('/admin/tasks') },
      { href: '/admin/projects', label: 'Projects', icon: Icon.ClipboardList, active: p => p.startsWith('/admin/projects') },
      { href: '/admin/ideas', label: 'Ideas', icon: Icon.Lightbulb, active: p => p.startsWith('/admin/ideas') },
      { href: '/admin/family', label: 'Family', icon: Icon.Users, active: p => p.startsWith('/admin/family') },
      { href: '/admin/photos', label: 'Photos', icon: Icon.Image, active: p => p.startsWith('/admin/photos') },
      { href: '/admin/devices', label: 'Devices', icon: Icon.Screen, active: p => p.startsWith('/admin/devices') },
    ],
  },
  {
    label: 'Sunday Planning',
    adminOnly: true,
    items: [
      { href: '/admin', label: 'Setup', icon: Icon.Settings, active: p => p === '/admin' },
      { href: '/meeting', label: 'Meeting', icon: Icon.Users, active: p => p.startsWith('/meeting') },
    ],
  },
]

const mobileItems: NavItem[] = [
  navGroups[0].items[0],
  navGroups[0].items[1],
  navGroups[1].items[1],
  navGroups[1].items[0],
  navGroups[0].items[2],
]

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

  // For Supabase-authed pages, show the new role-aware nav.
  // If we don't know the user yet, render nothing to avoid flicker.
  if (!authChecked) return null
  if (!role) return null

  const visibleGroups = navGroups.filter(group => !group.adminOnly || role === 'admin')
  const visibleMobileItems = mobileItems.filter(item => {
    const isAdminItem = navGroups.some(group => group.adminOnly && group.items.includes(item))
    return !isAdminItem || role === 'admin'
  })

  return <SiteNav pathname={pathname} groups={visibleGroups} mobileItems={visibleMobileItems} onLogout={async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }} />
}

function SiteNav({ pathname, groups, mobileItems, onLogout }: {
  pathname: string; groups: NavGroup[]; mobileItems: NavItem[]; onLogout: () => void
}) {
  const dailyGroup = groups.find(group => group.label === 'Daily')
  const menuGroups = groups.filter(group => group.label !== 'Daily')
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const menuRootId = useId()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenGroup(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  return (
    <>
      <style>{`
        .site-top-nav{display:none}
        .site-bottom-nav{display:flex}
        @media (min-width: 1024px){
          .site-top-nav{display:block}
          .site-bottom-nav{display:none}
        }
        .desktop-nav-menu{position:relative}
        .desktop-nav-menu-panel{position:absolute;right:0;top:calc(100% + 8px);min-width:220px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-lg);padding:8px;z-index:120}
        .desktop-nav-menu-link{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:var(--radius-md);text-decoration:none;color:var(--text);font-size:13px;font-weight:650;white-space:nowrap}
        .desktop-nav-menu-link:hover{background:var(--bg)}
      `}</style>
      <header className="site-top-nav" style={{ background:'var(--navy)', borderBottom:'1px solid var(--navy-soft)', color:'#fff', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:18 }}>
          <Link href="/dashboard" style={{ textDecoration:'none', color:'#fff', display:'flex', flexDirection:'column', minWidth:150 }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>Family Planner</span>
            <span style={{ fontSize:11, color:'#7070A0', letterSpacing:'0.08em', textTransform:'uppercase' }}>Home base</span>
          </Link>
          <nav aria-label="Main navigation" style={{ display:'flex', alignItems:'center', gap:10, flex:1, justifyContent:'center', minWidth:0 }}>
            {dailyGroup?.items.map(item => {
              const active = item.active(pathname)
              return (
                <Link key={`${item.href}-${item.label}`} href={item.href}
                  aria-current={active ? 'page' : undefined}
                  style={{ textDecoration:'none', color:active ? '#FFE7DA' : 'rgba(255,255,255,0.68)', background:active ? 'rgba(255,231,218,0.12)' : 'transparent', border:`1px solid ${active ? 'rgba(255,231,218,0.22)' : 'transparent'}`, borderRadius:8, padding:'8px 10px', fontSize:13, fontWeight:active ? 700 : 600, whiteSpace:'nowrap' }}>
                  {item.label}
                </Link>
              )
            })}
            {menuGroups.map(group => {
              const isOpen = openGroup === group.label
              const groupActive = group.items.some(item => item.active(pathname))
              const menuId = `${menuRootId}-${group.label.toLowerCase().replace(/\s+/g, '-')}`
              return (
                <div key={group.label} className="desktop-nav-menu">
                  <button type="button"
                    onClick={() => setOpenGroup(isOpen ? null : group.label)}
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    aria-controls={menuId}
                    style={{ background:groupActive ? 'rgba(255,231,218,0.12)' : 'rgba(255,255,255,0.06)', border:`1px solid ${groupActive ? 'rgba(255,231,218,0.22)' : 'rgba(255,255,255,0.12)'}`, color:groupActive ? '#FFE7DA' : 'rgba(255,255,255,0.74)', borderRadius:8, padding:'8px 10px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>
                    {group.label}
                  </button>
                  {isOpen && (
                    <div className="desktop-nav-menu-panel" id={menuId} role="menu" aria-label={group.label}>
                      {group.items.map(item => {
                  const active = item.active(pathname)
                  return (
                    <Link key={`${group.label}-${item.href}-${item.label}`} href={item.href}
                      className="desktop-nav-menu-link"
                      aria-current={active ? 'page' : undefined}
                      role="menuitem"
                      onClick={() => setOpenGroup(null)}
                      style={{ background:active ? 'var(--bg)' : 'transparent' }}>
                      <span style={{ color:active ? 'var(--accent)' : 'var(--muted)', display:'flex' }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
          <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', color:'#B8B8D8', borderRadius:8, padding:'8px 10px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:700 }}>
            Sign out
          </button>
        </div>
      </header>
      <nav className="site-bottom-nav" aria-label="Mobile navigation" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--navy)', borderTop: '1px solid var(--navy-soft)',
        padding: '10px 8px', justifyContent: 'space-around',
        alignItems: 'center', zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
      }}>
        {mobileItems.map(item => {
          const active = item.active(pathname)
          return (
            <Link key={`${item.href}-${item.label}`} href={item.href}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1, textAlign: 'center', textDecoration: 'none',
                color: active ? '#FFE7DA' : '#7070A0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 4px', fontFamily: "'DM Sans', sans-serif",
                fontSize: 11, fontWeight: active ? 600 : 400,
              }}>
              {item.icon}
              <span>{item.shortLabel ?? item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
