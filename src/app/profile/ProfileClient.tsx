'use client'

import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase'
import type { FamilyMember } from '@/lib/types/dashboard'

export default function ProfileClient({ member }: { member: FamilyMember }) {
  const [displayName, setDisplayName] = useState(member.display_name)
  const [phone, setPhone] = useState(member.phone ?? '')
  const [color, setColor] = useState(member.color ?? '#7F77DD')
  const [icsFeeds, setIcsFeeds] = useState((member.ics_feeds ?? []).join('\n'))
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const save = async () => {
    setStatus('saving')
    setErrMsg('')
    const supabase = getSupabaseBrowser()

    const { error: profileErr } = await supabase
      .from('family_members')
      .update({
        display_name: displayName,
        phone: phone || null,
        color,
        ics_feeds: icsFeeds.split('\n').map(s => s.trim()).filter(Boolean),
      })
      .eq('id', member.id)

    if (profileErr) {
      setErrMsg(profileErr.message)
      setStatus('error')
      return
    }

    if (newPassword) {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
      if (pwErr) {
        setErrMsg(pwErr.message)
        setStatus('error')
        return
      }
      setNewPassword('')
    }

    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 14, border: '1.5px solid #DDD8CF',
    borderRadius: 8, marginBottom: 16, fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#1A1A2E' }}>Your profile</h1>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: '#8B8599',
                                          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign out
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#8B8599', marginBottom: 24 }}>
        Username <strong style={{ color: '#4A4A5A' }}>{member.username}</strong>
        &nbsp;·&nbsp;
        Email <strong style={{ color: '#4A4A5A' }}>{member.email}</strong>
      </p>

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#4A4A5A' }}>
        Display name
      </label>
      <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#4A4A5A' }}>
        Phone (E.164 format like +18015551234)
      </label>
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+18015551234" style={inputStyle} />

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#4A4A5A' }}>
        Color
      </label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          style={{ width: 50, height: 38, border: '1.5px solid #DDD8CF', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
        <input value={color} onChange={e => setColor(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
      </div>

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#4A4A5A' }}>
        Personal calendar feeds (one ICS URL per line)
      </label>
      <textarea value={icsFeeds} onChange={e => setIcsFeeds(e.target.value)} rows={3}
        placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />

      <hr style={{ border: 'none', borderTop: '1px solid #E8E3DB', margin: '24px 0' }} />

      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#4A4A5A' }}>
        Set a new password (leave blank to keep current)
      </label>
      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
        autoComplete="new-password" style={inputStyle} />

      {errMsg && <div style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{errMsg}</div>}

      <button onClick={save} disabled={status === 'saving'}
        style={{ padding: '12px 20px', background: '#C4522A', color: '#fff', border: 'none',
                 borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                 fontFamily: 'inherit', opacity: status === 'saving' ? 0.6 : 1 }}>
        {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save changes'}
      </button>
    </div>
  )
}
