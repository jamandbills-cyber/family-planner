'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

// Shows on /admin only when navigated to from the Supabase-authed dashboard
// (via the bottom nav's "Sunday Plan" link, which adds ?from=dashboard).
// Reminds the user that this section uses a separate Google sign-in.
export default function SundayPlanBanner() {
  const search = useSearchParams()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (search.get('from') === 'dashboard') setShow(true)
  }, [search])

  if (!show) return null

  return (
    <div style={{
      background: '#FFFBEB', border: '1px solid #FDE68A',
      padding: '12px 16px', margin: '12px 16px', borderRadius: 8,
      fontSize: 13, color: '#92400E', fontFamily: "'DM Sans', sans-serif",
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ flex: 1, lineHeight: 1.5 }}>
        <strong>Sunday Planning uses a separate Google sign-in</strong>
        <div style={{ marginTop: 4 }}>
          If you got here from the Dashboard and weren't already signed in with Google,
          you may have just been asked to sign in again. That's expected — this section
          uses your Google calendar directly.
        </div>
        <a href="/dashboard" style={{ display: 'inline-block', marginTop: 8,
          color: '#92400E', fontWeight: 600, textDecoration: 'underline', fontSize: 12 }}>
          ← Back to Dashboard
        </a>
      </div>
      <button onClick={() => setShow(false)}
        style={{ background: 'none', border: 'none', cursor: 'pointer',
                 color: '#92400E', fontSize: 18, padding: 0, lineHeight: 1 }}>
        ×
      </button>
    </div>
  )
}
