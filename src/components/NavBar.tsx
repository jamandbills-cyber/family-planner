'use client'

import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin',   label: 'Setup',   icon: '⚙️' },
  { href: '/meeting', label: 'Meeting', icon: '👨‍👩‍👧‍👦' },
  { href: '/plan',    label: 'Plan',    icon: '📅' },
]

export default function NavBar() {
  const pathname = usePathname()

  // Don't show on form pages or auth pages
  if (pathname?.startsWith('/form') || pathname?.startsWith('/auth')) return null

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#1A1A2E',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      padding: '10px 16px 14px',
      zIndex: 100,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {NAV_ITEMS.map(item => {
        const active = pathname === item.href
        return (
          <a key={item.href} href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '8px 24px',
              borderRadius: 10,
              textDecoration: 'none',
              background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: `1.5px solid ${active ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
              transition: 'all 0.12s',
              minWidth: 80,
            }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{
              fontSize: 11,
              fontWeight: active ? 700 : 400,
              color: active ? '#fff' : 'rgba(255,255,255,0.5)',
              letterSpacing: '0.04em',
            }}>
              {item.label}
            </span>
          </a>
        )
      })}
    </nav>
  )
}
