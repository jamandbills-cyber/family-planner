'use client'

import { useState } from 'react'
import type { FamilyMember } from '@/lib/types/dashboard'
import { Alert, Button, Card, Field, PageHeader, PageShell, SelectField, StatusPill } from '@/components/ui'

export default function FamilyAdminClient({ initialMembers }: { initialMembers: FamilyMember[] }) {
  const [members, setMembers] = useState(initialMembers)
  const [adding, setAdding] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const addMember = async (form: FormData) => {
    setErrMsg('')
    const body = {
      id:           form.get('id') as string,
      username:     (form.get('username') as string).toLowerCase(),
      email:        form.get('email') as string,
      display_name: form.get('display_name') as string,
      type:         form.get('type') as string,
      role:         form.get('role') as string,
      phone:        (form.get('phone') as string) || null,
      color:        (form.get('color') as string) || null,
    }
    const res = await fetch('/api/admin/family', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setErrMsg(data.error || 'Failed'); return }
    setMembers([...members, data.member])
    setAdding(false)
  }

  const updateMember = async (id: string, patch: Partial<FamilyMember>) => {
    setErrMsg('')
    const res = await fetch(`/api/admin/family/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMembers(members.map(m => m.id === id ? { ...m, ...(data.member ?? patch) } : m))
    } else {
      setErrMsg(data.error ?? 'Failed to update member')
    }
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Delete this member? This removes their account too.')) return
    setErrMsg('')
    const res = await fetch(`/api/admin/family/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setMembers(members.filter(m => m.id !== id))
    else setErrMsg(data.error ?? 'Failed to delete member')
  }

  return (
    <PageShell size="wide">
      <PageHeader
        title="Family roster"
        description="Manage family members, contact info, dashboard colors, and admin access."
        actions={!adding && <Button onClick={() => setAdding(true)}>Add member</Button>}
      />
      {errMsg && <Alert tone="danger" style={{ marginBottom: 16 }}>{errMsg}</Alert>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
        {members.map(m => (
          <Card key={m.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <input
                  aria-label={`${m.display_name} color`}
                  type="color"
                  value={m.color ?? '#888888'}
                  onChange={e => updateMember(m.id, { color: e.target.value })}
                  style={{ width: 34, height: 34, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 800 }}>{m.display_name}</div>
                  <div style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 12 }}>{m.username}</div>
                </div>
              </div>
              <StatusPill tone={m.role === 'admin' ? 'info' : 'neutral'}>{m.role}</StatusPill>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <Field
                label="Display name"
                defaultValue={m.display_name}
                onBlur={e => updateMember(m.id, { display_name: e.target.value })}
              />
              <Field label="Email" value={m.email ?? ''} readOnly />
              <Field
                label="Phone"
                defaultValue={m.phone ?? ''}
                onBlur={e => updateMember(m.id, { phone: e.target.value })}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                <SelectField label="Type" defaultValue={m.type} onChange={e => updateMember(m.id, { type: e.target.value as any })}>
                  <option value="adult">adult</option>
                  <option value="child">child</option>
                </SelectField>
                <SelectField label="Role" defaultValue={m.role} onChange={e => updateMember(m.id, { role: e.target.value as any })}>
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </SelectField>
              </div>
              <Button variant="ghost" onClick={() => deleteMember(m.id)} style={{ color: 'var(--danger)', justifySelf: 'start', paddingLeft: 0 }}>
                Delete member
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {adding ? (
        <Card>
          <form action={addMember}>
            <h2 style={{ color: 'var(--text)', fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 12 }}>New member</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Field name="id" label="ID" placeholder="lowercase, e.g. justin" required />
              <Field name="username" label="Username" required />
              <Field name="display_name" label="Display name" required />
              <Field name="email" label="Email" type="email" required />
              <Field name="phone" label="Phone" placeholder="+18015551234" />
              <Field name="color" label="Color" type="color" defaultValue="#7F77DD" style={{ padding: 4, height: 42 }} />
              <SelectField name="type" label="Type" required defaultValue="adult">
              <option value="adult">Adult</option><option value="child">Child</option>
              </SelectField>
              <SelectField name="role" label="Role" required defaultValue="member">
              <option value="member">Member</option><option value="admin">Admin</option>
              </SelectField>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="submit">Add member</Button>
              <Button variant="secondary" onClick={() => { setAdding(false); setErrMsg('') }}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}
    </PageShell>
  )
}
