'use client'

import { useState } from 'react'
import { Alert, Button, Card, EmptyState, Field, PageHeader, PageShell, SelectField, StatusPill } from '@/components/ui'

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

  return (
    <PageShell>
      <PageHeader
        title="Devices"
        description="Each Pi or signage stick gets a unique URL. Anyone with the URL sees the dashboard, no login needed. Revoke a device to stop a URL from working."
        actions={!adding && <Button onClick={() => setAdding(true)}>Mint device URL</Button>}
      />
      {errMsg && <Alert tone="danger" style={{ marginBottom: 16 }}>{errMsg}</Alert>}

      {devices.length === 0 ? (
        <EmptyState title="No devices yet">
          Mint a device URL for the kitchen display or a personal dashboard.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
          {devices.map(d => {
            const memberName = d.member_id
              ? members.find(m => m.id === d.member_id)?.display_name ?? d.member_id
              : null
            return (
              <Card key={d.id} style={{ opacity: d.revoked ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 800 }}>{d.label}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>
                      {d.view_type === 'kitchen' ? 'Kitchen display' : `Personal dashboard${memberName ? ` for ${memberName}` : ''}`}
                    </div>
                  </div>
                  <StatusPill tone={d.revoked ? 'danger' : 'success'}>{d.revoked ? 'Revoked' : 'Active'}</StatusPill>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 14 }}>
                  Last seen: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : 'never'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!d.revoked && (
                    <>
                      <Button variant="secondary" onClick={() => copyUrl(d.token, d.id)} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {copiedId === d.id ? 'Copied' : 'Copy URL'}
                      </Button>
                      <Button variant="ghost" onClick={() => revokeDevice(d.id)} style={{ color: 'var(--danger)' }}>
                        Revoke
                      </Button>
                    </>
                  )}
                  {d.revoked && (
                    <Button variant="ghost" onClick={() => deleteDevice(d.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {adding ? (
        <Card>
          <form action={addDevice}>
            <h2 style={{ color: 'var(--text)', fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 12 }}>New device</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Field name="label" label="Label" placeholder='e.g. "Kitchen"' required />
              <SelectField name="view_type" label="View type" required defaultValue="">
              <option value="" disabled>View type...</option>
              <option value="kitchen">Kitchen (everyone)</option>
              <option value="personal">Personal (one member)</option>
              </SelectField>
              <SelectField name="member_id" label="Member" defaultValue="">
              <option value="">— for personal view —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </SelectField>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="submit">Mint URL</Button>
              <Button variant="secondary" onClick={() => { setAdding(false); setErrMsg('') }}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}
    </PageShell>
  )
}
