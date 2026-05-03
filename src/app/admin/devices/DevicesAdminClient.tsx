'use client'

import { useState } from 'react'

type Device = {
  id: string
  token: string
  label: string
  view_type: 'kitchen' | 'personal'
  member_id: string | null
  revoked: boolean
  last_seen_at: string | null
  created_at: string
}

type Member = { id: string; display_name: string }

export default function DevicesAdminClient({
  initialDevices, members,
}: { initialDevices: Device[]; members: Member[] }) {
  const [devices, setDevices] = useState(initialDevices)
  const [adding, setAdding] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const addDevice = async (form: FormData) => {
    setErrMsg('')
    const view_type = form.get('view_type') as string
    const body = {
      label: form.get('label'),
      view_type,
      member_id: view_type === 'personal' ? form.get('member_id') : null,
    }
    const res = await fetch('/api/admin/devices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setErrMsg(data.error || 'Failed'); return }
    setDevices([data.device, ...devices])
    setAdding(false)
  }

  const revokeDevice = async (id: string) => {
    if (!confirm('Revoke this device URL? The display will stop working immediately.')) return
    const res = await fetch('/api/admin/devices', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, revoked: true }),
    })
    if (res.ok) setDevices(devices.map(d => d.id === id ? { ...d, revoked: true } : d))
  }

  const deleteDevice = async (id: string) => {
    if (!confirm('Permanently delete this device?')) return
    const res = await fetch('/api/admin/devices', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setDevices(devices.filter(d => d.id !== id))
  }

  const copyUrl = (token: string, id: string) => {
    navigator.clipboard.writeText(`${origin}/d/${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const inputS: React.CSSProperties = {
    padding: '8px 10px', fontSize: 13, border: '1px solid #DDD8CF',
    borderRadius: 6, fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 8 }}>
        Devices
      </h1>
      <p style={{ fontSize: 13, color: '#8B8599', marginBottom: 24 }}>
        Each Pi or signage stick gets a unique URL. Anyone with the URL sees the dashboard, no login needed.
        Revoke a device to stop a URL from working.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E8E3DB', textAlign: 'left' }}>
            {['Label', 'View', 'Last seen', 'URL', ''].map(h =>
              <th key={h} style={{ padding: '10px 8px', fontWeight: 600, color: '#4A4A5A' }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {devices.map(d => {
            const memberName = d.member_id
              ? members.find(m => m.id === d.member_id)?.display_name ?? d.member_id
              : '—'
            return (
              <tr key={d.id} style={{ borderBottom: '1px solid #F0EDE7',
                                      opacity: d.revoked ? 0.4 : 1 }}>
                <td style={{ padding: '10px 8px', fontWeight: 500 }}>{d.label}</td>
                <td style={{ padding: '10px 8px' }}>
                  {d.view_type === 'kitchen' ? 'Kitchen' : `Personal (${memberName})`}
                </td>
                <td style={{ padding: '10px 8px', color: '#8B8599', fontSize: 12 }}>
                  {d.last_seen_at
                    ? new Date(d.last_seen_at).toLocaleString()
                    : 'never'}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  {d.revoked ? (
                    <span style={{ color: '#DC2626', fontSize: 12 }}>Revoked</span>
                  ) : (
                    <button onClick={() => copyUrl(d.token, d.id)}
                      style={{ background: '#F7F4EF', border: '1px solid #DDD8CF',
                               borderRadius: 4, padding: '4px 8px', fontSize: 11,
                               cursor: 'pointer', fontFamily: 'monospace' }}>
                      {copiedId === d.id ? '✓ Copied' : 'Copy URL'}
                    </button>
                  )}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  {!d.revoked && (
                    <button onClick={() => revokeDevice(d.id)}
                      style={{ background: 'none', border: 'none', color: '#DC2626',
                               cursor: 'pointer', fontSize: 12 }}>
                      Revoke
                    </button>
                  )}
                  {d.revoked && (
                    <button onClick={() => deleteDevice(d.id)}
                      style={{ background: 'none', border: 'none', color: '#8B8599',
                               cursor: 'pointer', fontSize: 12 }}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {adding ? (
        <form action={addDevice} style={{ background: '#F7F4EF', padding: 16, borderRadius: 8 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>New device</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <input name="label" placeholder='Label (e.g. "Kitchen")' required style={inputS} />
            <select name="view_type" required style={inputS} defaultValue="">
              <option value="" disabled>View type...</option>
              <option value="kitchen">Kitchen (everyone)</option>
              <option value="personal">Personal (one member)</option>
            </select>
            <select name="member_id" style={inputS} defaultValue="">
              <option value="">— for personal view —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </div>
          {errMsg && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{errMsg}</div>}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '8px 16px', background: '#C4522A', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Mint URL
            </button>
            <button type="button" onClick={() => { setAdding(false); setErrMsg('') }}
              style={{ padding: '8px 16px', background: '#fff', border: '1px solid #DDD8CF',
                       borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ padding: '10px 16px', background: '#1A1A2E', color: '#fff',
                   border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Mint device URL
        </button>
      )}
    </div>
  )
}
