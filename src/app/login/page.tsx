'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const next = useSearchParams().get('next') ?? '/dashboard'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')
    try {
      if (mode === 'password') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        })
        if (!res.ok) {
          const { error } = await res.json()
          setErrMsg(error || 'Login failed')
          setStatus('error')
          return
        }
        router.push(next)
        router.refresh()
      } else {
        const res = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })
        if (!res.ok) {
          setErrMsg('Failed to send link')
          setStatus('error')
          return
        }
        setStatus('sent')
      }
    } catch (e: any) {
      setErrMsg(e.message || 'Something went wrong')
      setStatus('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 14, border: '1.5px solid #DDD8CF',
    borderRadius: 8, marginBottom: 16, fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#1A1A2E', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 16, padding: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 4, color: '#1A1A2E' }}>
          Sign in
        </h1>
        <p style={{ fontSize: 13, color: '#8B8599', marginBottom: 24 }}>Family planner</p>

        {status === 'sent' ? (
          <div style={{ padding: 16, background: '#F0FDF4', border: '1px solid #BBF7D0',
                        borderRadius: 8, fontSize: 14, color: '#15803D' }}>
            Check your email for a sign-in link.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#4A4A5A' }}>
              Username
            </label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="username" required autoFocus style={inputStyle} />

            {mode === 'password' && (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#4A4A5A' }}>
                  Password
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" required={mode === 'password'} style={inputStyle} />
              </>
            )}

            {errMsg && <div style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{errMsg}</div>}

            <button type="submit" disabled={status === 'loading'}
              style={{ width: '100%', padding: '12px', background: '#C4522A', color: '#fff',
                       border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                       cursor: 'pointer', fontFamily: 'inherit', opacity: status === 'loading' ? 0.6 : 1 }}>
              {status === 'loading' ? '…' : mode === 'password' ? 'Sign in' : 'Send sign-in link'}
            </button>

            <button type="button"
              onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setErrMsg('') }}
              style={{ width: '100%', padding: '10px', background: 'none', border: 'none',
                       color: '#8B8599', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>
              {mode === 'password' ? 'Or sign in with email link' : 'Or use password'}
            </button>
          </form>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #E8E3DB', margin: '24px 0 16px' }} />

        <a href="/admin"
          style={{ display: 'block', textAlign: 'center', color: '#8B8599', fontSize: 12,
                   textDecoration: 'none', fontFamily: 'inherit' }}>
          Admin setting up the weekly Sunday plan? <span style={{ color: '#C4522A', fontWeight: 600 }}>
            Open Sunday Planning →
          </span>
        </a>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
