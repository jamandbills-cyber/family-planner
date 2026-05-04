'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'

type Member = { id: string; display_name: string; color: string | null }
type Idea = {
  id: string
  text: string
  created_at: string
  owner_id: string
  owner: Member | null
}

export default function IdeasClient() {
  const [members, setMembers] = useState<Member[]>([])
  const [ideas, setIdeas]     = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [owner_id, setOwnerId] = useState('')
  const [text, setText]        = useState('')

  const safeJson = async (res: Response) => {
    const t = await res.text()
    if (!t) return {}
    try { return JSON.parse(t) } catch { return { error: t } }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [mRes, iRes] = await Promise.all([
        fetch('/api/admin/family'),
        fetch('/api/admin/ideas'),
      ])
      const mData = await safeJson(mRes)
      const iData = await safeJson(iRes)
      if (!iRes.ok) throw new Error(iData.error ?? 'Failed to load')
      setMembers((mData.members ?? []).map((m: any) => ({
        id: m.id,
        display_name: m.display_name ?? m.name ?? m.id,
        color: m.color ?? null,
      })))
      setIdeas(iData.ideas ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!owner_id || !text.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id, text: text.trim() }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setIdeas(i => [data.idea, ...i])
      setText('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this idea?')) return
    try {
      const res = await fetch(`/api/admin/ideas/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.error ?? 'Failed')
      }
      setIdeas(is => is.filter(i => i.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Idea[]>()
    members.forEach(m => map.set(m.id, []))
    ideas.forEach(i => {
      const arr = map.get(i.owner_id) ?? []
      arr.push(i)
      map.set(i.owner_id, arr)
    })
    return members
      .map(m => ({ member: m, ideas: map.get(m.id) ?? [] }))
      .filter(g => g.ideas.length > 0)
  }, [ideas, members])

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#F7F4EF', minHeight: '100vh', padding: 24,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <a href="/manage" style={{ fontSize: 13, color: '#8B8599', textDecoration: 'none' }}>← Back to manage</a>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1A1A2E', margin: '4px 0 6px' }}>
            Ideas
          </h1>
          <p style={{ fontSize: 14, color: '#8B8599', margin: 0 }}>
            Random thoughts, wishlist items, things to remember. Less structured than tasks.
          </p>
        </div>

        <div style={{
          background: '#fff', border: '1px solid #E8E3DB', borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 200px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
                For whom *
              </label>
              <select value={owner_id}
                onChange={e => setOwnerId(e.target.value)}
                style={{
                  width: '100%', border: '1.5px solid #E2DDD6', borderRadius: 7,
                  padding: '9px 10px', fontSize: 14, fontFamily: 'inherit', background: '#fff',
                }}>
                <option value="">— Select person —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
                Idea *
              </label>
              <input value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && owner_id && text.trim()) create() }}
                placeholder="e.g. Look into ski lessons next winter"
                style={{
                  width: '100%', border: '1.5px solid #E2DDD6', borderRadius: 7,
                  padding: '9px 10px', fontSize: 14, fontFamily: 'inherit',
                }} />
            </div>
            <button onClick={create}
              disabled={creating || !owner_id || !text.trim()}
              style={{
                background: '#C4522A', color: '#fff', border: 'none',
                borderRadius: 7, padding: '10px 20px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                opacity: (creating || !owner_id || !text.trim()) ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}>
              {creating
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Adding…</>
                : <><Plus size={14} /> Add</>}
            </button>
          </div>
          {error && (
            <div style={{ marginTop: 10, fontSize: 13, color: '#DC2626' }}>⚠ {error}</div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8B8599' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : grouped.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px dashed #DDD8CF', borderRadius: 12,
            padding: 40, textAlign: 'center', color: '#8B8599', fontSize: 14,
          }}>
            No ideas yet. Add one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {grouped.map(g => (
              <div key={g.member.id} style={{
                background: '#fff', border: '1px solid #E8E3DB', borderRadius: 12,
                overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px', borderBottom: '1px solid #F0EDE8',
                  background: '#FAFAF7',
                }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: g.member.color ?? '#888780',
                  }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>
                    {g.member.display_name}
                  </span>
                  <span style={{ fontSize: 12, color: '#8B8599' }}>
                    {g.ideas.length} idea{g.ideas.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div>
                  {g.ideas.map(i => (
                    <div key={i.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', borderBottom: '1px solid #F0EDE8',
                    }}>
                      <div style={{ flex: 1, fontSize: 14, color: '#1A1A2E' }}>{i.text}</div>
                      <button onClick={() => remove(i.id)}
                        title="Delete"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#C4B8A8', padding: 6, display: 'flex',
                        }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
