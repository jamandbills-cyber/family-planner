'use client'

import { useState } from 'react'
import type { FamilyMember } from '@/lib/types/dashboard'

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
    const res = await fetch('/api/admin/family', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (res.ok) {
      setMembers(members.map(m => m.id === id ? { ...m, ...patch } : m))
    }
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Delete this member? This removes their account too.')) return
    const res = await fetch('/api/admin/family', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setMembers(members.filter(m => m.id !== id))
  }

  const inputS: React.CSSProperties = {
    padding: '8px 10px', fontSize: 13, border: '1px solid #DDD8CF',
    borderRadius: 6, fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 24 }}>Family roster</h1>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E8E3DB', textAlign: 'left' }}>
            {['Color', 'Username', 'Display name', 'Email', 'Phone', 'Type', 'Role', ''].map(h =>
              <th key={h} style={{ padding: '10px 8px', fontWeight: 600, color: '#4A4A5A' }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id} style={{ borderBottom: '1px solid #F0EDE7' }}>
              <td style={{ padding: '8px' }}>
                <input type="color" value={m.color ?? '#888888'}
                  onChange={e => updateMember(m.id, { color: e.target.value })}
                  style={{ width: 32, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
              </td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{m.username}</td>
              <td style={{ padding: '8px' }}>
                <input defaultValue={m.display_name}
                  onBlur={e => updateMember(m.id, { display_name: e.target.value })}
                  style={{ ...inputS, width: '100%' }} />
              </td>
              <td style={{ padding: '8px', fontSize: 12 }}>{m.email}</td>
              <td style={{ padding: '8px' }}>
                <input defaultValue={m.phone ?? ''}
                  onBlur={e => updateMember(m.id, { phone: e.target.value })}
                  style={{ ...inputS, width: 140 }} />
              </td>
              <td style={{ padding: '8px' }}>
                <select defaultValue={m.type} onChange={e => updateMember(m.id, { type: e.target.value as any })}
                  style={inputS}>
                  <option value="adult">adult</option>
                  <option value="child">child</option>
                </select>
              </td>
              <td style={{ padding: '8px' }}>
                <select defaultValue={m.role} onChange={e => updateMember(m.id, { role: e.target.value as any })}
                  style={inputS}>
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td style={{ padding: '8px' }}>
                <button onClick={() => deleteMember(m.id)}
                  style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12 }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {adding ? (
        <form action={addMember} style={{ background: '#F7F4EF', padding: 16, borderRadius: 8 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>New member</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <input name="id" placeholder="ID (lowercase, e.g. justin)" required style={inputS} />
            <input name="username" placeholder="Username" required style={inputS} />
            <input name="display_name" placeholder="Display name" required style={inputS} />
            <input name="email" type="email" placeholder="Email" required style={inputS} />
            <input name="phone" placeholder="+18015551234" style={inputS} />
            <input name="color" type="color" defaultValue="#7F77DD" style={{ ...inputS, padding: 4 }} />
            <select name="type" required style={inputS} defaultValue="adult">
              <option value="adult">Adult</option><option value="child">Child</option>
            </select>
            <select name="role" required style={inputS} defaultValue="member">
              <option value="member">Member</option><option value="admin">Admin</option>
            </select>
          </div>
          {errMsg && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{errMsg}</div>}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '8px 16px', background: '#C4522A', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Add
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
          + Add member
        </button>
      )}
    </div>
  )
}
