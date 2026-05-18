'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Alert, Button, Card, EmptyState, Field, IconButton, LoadingState, PageHeader, PageShell, SelectField, StatusPill } from '@/components/ui'

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
    <PageShell>
      <PageHeader
        eyebrow={<a href="/manage" style={{ color: 'inherit', textDecoration: 'none' }}>Back to manage</a>}
        title="Ideas"
        description="Random thoughts, wishlist items, and things to remember. Less structured than tasks."
      />

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' }}>
          <SelectField label="For whom *" value={owner_id} onChange={e => setOwnerId(e.target.value)}>
            <option value="">Select person</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </SelectField>
          <Field
            label="Idea *"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && owner_id && text.trim()) create() }}
            placeholder="e.g. Look into ski lessons next winter"
          />
          <Button onClick={create} disabled={creating || !owner_id || !text.trim()}>
            {creating
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Adding...</>
              : <><Plus size={14} /> Add</>}
          </Button>
        </div>
        {error && <Alert tone="danger" style={{ marginTop: 12 }}>{error}</Alert>}
      </Card>

      {loading ? (
        <LoadingState label="Loading ideas..." />
      ) : grouped.length === 0 ? (
        <EmptyState title="No ideas yet">
          Add one above so it is saved for the right person.
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grouped.map(g => (
            <Card key={g.member.id} padded={false} style={{ overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-soft)',
                }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: g.member.color ?? '#888780',
                  }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                    {g.member.display_name}
                  </span>
                  <StatusPill>
                    {g.ideas.length} idea{g.ideas.length === 1 ? '' : 's'}
                  </StatusPill>
                </div>
                <div>
                  {g.ideas.map(i => (
                    <div key={i.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{i.text}</div>
                      <IconButton label={`Delete idea: ${i.text}`} onClick={() => remove(i.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  ))}
                </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}
