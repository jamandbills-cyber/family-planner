'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Tv, User, Loader2, ExternalLink, Copy, Check } from 'lucide-react'

type Device = {
  id: string
  token: string
  label: string
  view_type: 'kitchen' | 'personal'
  member_id: string | null
  created_at: string
}

type Member = { id: string; display_name: string }

export default function DevicesClient() {
  const [devices, setDevices]   = useState<Device[]>([])
  const [members, setMembers]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [copied, setCopied]     = useState<string | null>(null)

  const [newLabel, setNewLabel]     = useState('')
  const [newType, setNewType]       = useState<'kitchen' | 'personal'>('kitchen')
  const [newMember, setNewMember]   = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dRes, mRes] = await Promise.all([
        fetch('/api/admin/devices'),
        fetch('/api/admin/family'),
      ])
      const dData = await dRes.json()
      const mData = await mRes.json()
      if (!dRes.ok) throw new Error(dData.error ?? 'Failed to load devices')
      setDevices(dData.devices ?? [])
      setMembers((mData.members ?? []).map((m: any) => ({
        id: m.id, display_name: m.display_name ?? m.name ?? m.id,
      })))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newLabel.trim()) return
    if (newType === 'personal' && !newMember) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          view_type: newType,
          member_id: newType === 'personal' ? newMember : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Create failed')
      setDevices(d => [data.device, ...d])
      setNewLabel(''); setNewMember(''); setShowAdd(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: string, label: string) => {
    if (!confirm(`Delete "${label}"? Anyone using this device will lose access.`)) return
    try {
      const res = await fetch(`/api/admin/devices/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Delete failed')
      }
      setDevices(d => d.filter(x => x.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const memberName = (id: string | null) =>
    id ? members.find(m => m.id === id)?.display_name ?? id : '—'

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#F7F4EF',
      minHeight: '100vh',
      padding: 24,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <a href="/manage" style={{ fontSize: 13, color: '#8B8599', textDecoration: 'none' }}>← Back to manage</a>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1A1A2E', margin: '4px 0 6px' }}>
            Devices
          </h1>
          <p style={{ fontSize: 14, color: '#8B8599', margin: 0 }}>
            Each display gets its own URL and QR code. Open the URL on the Fire TV / Signage Stick.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)}
              style={{
                background: '#C4522A', color: '#fff', border: 'none',
                borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: "'DM Sans', sans-serif",
              }}>
              <Plus size={15} /> Add Device
            </button>
          ) : (
            <div style={{
              background: '#fff', border: '1px solid #E8E3DB', borderRadius: 12,
              padding: 20,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
                    Label
                  </label>
                  <input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Kitchen TV"
                    style={{
                      width: '100%', border: '1.5px solid #E2DDD6', borderRadius: 7,
                      padding: '8px 10px', fontSize: 14, fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
                    View type
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['kitchen', 'personal'] as const).map(t => (
                      <button key={t} onClick={() => setNewType(t)}
                        style={{
                          padding: '8px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer',
                          border: `1.5px solid ${newType === t ? '#C4522A' : '#E2DDD6'}`,
                          background: newType === t ? '#FEF2EB' : '#fff',
                          color: newType === t ? '#C4522A' : '#4A4A5A',
                          fontWeight: newType === t ? 600 : 500,
                          fontFamily: 'inherit',
                        }}>
                        {t === 'kitchen' ? '🖥️ Kitchen (everyone)' : '👤 Personal (one person)'}
                      </button>
                    ))}
                  </div>
                </div>
                {newType === 'personal' && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
                      Person
                    </label>
                    <select value={newMember} onChange={e => setNewMember(e.target.value)}
                      style={{
                        width: '100%', border: '1.5px solid #E2DDD6', borderRadius: 7,
                        padding: '8px 10px', fontSize: 14, fontFamily: 'inherit',
                      }}>
                      <option value="">— Select —</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={create} disabled={creating || !newLabel.trim() || (newType === 'personal' && !newMember)}
                    style={{
                      background: '#C4522A', color: '#fff', border: 'none',
                      borderRadius: 7, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                      opacity: (creating || !newLabel.trim() || (newType === 'personal' && !newMember)) ? 0.5 : 1,
                    }}>
                    {creating ? 'Creating…' : 'Create Device'}
                  </button>
                  <button onClick={() => { setShowAdd(false); setNewLabel(''); setNewMember('') }}
                    style={{
                      background: '#fff', color: '#4A4A5A',
                      border: '1.5px solid #E2DDD6', borderRadius: 7,
                      padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 16,
          }}>⚠ {error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8B8599' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : devices.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px dashed #DDD8CF', borderRadius: 12,
            padding: 40, textAlign: 'center', color: '#8B8599', fontSize: 14,
          }}>
            No devices yet. Add one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {devices.map(d => {
              const url = typeof window !== 'undefined'
                ? `${window.location.origin}/d/${d.token}`
                : `/d/${d.token}`
              const qrUrl = `/api/qr/${d.token}`
              return (
                <div key={d.id} style={{
                  background: '#fff', border: '1px solid #E8E3DB',
                  borderRadius: 12, padding: 16,
                  display: 'grid', gridTemplateColumns: '120px 1fr auto',
                  gap: 16, alignItems: 'center',
                }}>
                  <img src={qrUrl} alt="QR"
                    style={{
                      width: 120, height: 120, border: '1px solid #E8E3DB',
                      borderRadius: 8, background: '#fff',
                    }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {d.view_type === 'kitchen'
                        ? <Tv size={15} style={{ color: '#C4522A' }} />
                        : <User size={15} style={{ color: '#7C3AED' }} />}
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>{d.label}</span>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
                        background: d.view_type === 'kitchen' ? '#FEF2EB' : '#F3EFFE',
                        color:      d.view_type === 'kitchen' ? '#C4522A' : '#7C3AED',
                      }}>
                        {d.view_type === 'kitchen' ? 'Kitchen' : `Personal · ${memberName(d.member_id)}`}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 12, color: '#8B8599', fontFamily: 'monospace',
                      display: 'flex', alignItems: 'center', gap: 6,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</span>
                      <button onClick={() => copy(url, d.id)}
                        title="Copy URL"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: copied === d.id ? '#15803D' : '#8B8599',
                          padding: 4, display: 'flex', alignItems: 'center',
                        }}>
                        {copied === d.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                      <a href={url} target="_blank" rel="noreferrer"
                        style={{
                          fontSize: 12, color: '#1D4ED8', textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500,
                        }}>
                        Open <ExternalLink size={11} />
                      </a>
                      <a href={qrUrl} target="_blank" rel="noreferrer"
                        style={{
                          fontSize: 12, color: '#1D4ED8', textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500,
                        }}>
                        QR full size <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                  <button onClick={() => remove(d.id, d.label)}
                    title="Delete device"
                    style={{
                      background: '#FEF2F2', border: '1px solid #FECACA',
                      borderRadius: 7, padding: 8, cursor: 'pointer',
                      color: '#DC2626', display: 'flex', alignItems: 'center',
                    }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
