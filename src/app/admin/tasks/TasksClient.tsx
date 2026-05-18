'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Alert, Button, Card, EmptyState, Field, IconButton, LoadingState, PageHeader, PageShell, SelectField, StatusPill } from '@/components/ui'

type Member = { id: string; display_name: string; color: string | null }
type Project = { id: string; name: string; color: string | null; owner_id: string }
type Task = {
  id: string
  text: string
  due_date: string | null
  completed_at: string | null
  created_at: string
  owner_id: string
  project_id: string | null
  owner: Member | null
  project: { id: string; name: string; color: string | null } | null
}

export default function TasksClient() {
  const [members, setMembers]   = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [owner_id, setOwnerId]     = useState('')
  const [text, setText]            = useState('')
  const [due_date, setDueDate]     = useState('')
  const [project_id, setProjectId] = useState('')

  const safeJson = async (res: Response) => {
    const text = await res.text()
    if (!text) return {}
    try { return JSON.parse(text) } catch { return { error: text } }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [mRes, pRes, tRes] = await Promise.all([
        fetch('/api/admin/family'),
        fetch('/api/admin/projects'),
        fetch('/api/admin/tasks'),
      ])
      const mData = await safeJson(mRes)
      const pData = await safeJson(pRes)
      const tData = await safeJson(tRes)
      if (!tRes.ok) throw new Error(tData.error ?? 'Failed to load')
      setMembers((mData.members ?? []).map((m: any) => ({
        id: m.id,
        display_name: m.display_name ?? m.name ?? m.id,
        color: m.color ?? null,
      })))
      setProjects(pData.projects ?? [])
      setTasks(tData.tasks ?? [])
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
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id,
          text: text.trim(),
          due_date: due_date || null,
          project_id: project_id || null,
        }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error ?? 'Failed to create')
      setTasks(t => [data.task, ...t])
      setText(''); setDueDate(''); setProjectId('')
      // Refresh projects in case Personal was auto-created
      const pRes = await fetch('/api/admin/projects')
      const pData = await safeJson(pRes)
      setProjects(pData.projects ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this task?')) return
    try {
      const res = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.error ?? 'Failed')
      }
      setTasks(ts => ts.filter(t => t.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const complete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (!res.ok) throw new Error('Failed')
      setTasks(ts => ts.filter(t => t.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const memberProjects = useMemo(
    () => projects.filter(p => p.owner_id === owner_id),
    [projects, owner_id]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>()
    members.forEach(m => map.set(m.id, []))
    tasks.forEach(t => {
      const arr = map.get(t.owner_id) ?? []
      arr.push(t)
      map.set(t.owner_id, arr)
    })
    return members
      .map(m => ({ member: m, tasks: map.get(m.id) ?? [] }))
      .filter(g => g.tasks.length > 0)
  }, [tasks, members])

  const fmtDate = (d: string | null) => {
    if (!d) return null
    const [y, mo, da] = d.split('-').map(Number)
    return new Date(y, mo - 1, da).toLocaleDateString('en-US',
      { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={<a href="/manage" style={{ color: 'inherit', textDecoration: 'none' }}>Back to manage</a>}
        title="Tasks"
        description="Add tasks for any family member. They show up in that person's column on the kitchen TV and on their personal display."
      />

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
          <SelectField
            label="For whom *"
            value={owner_id}
            onChange={e => { setOwnerId(e.target.value); setProjectId('') }}
          >
            <option value="">Select person</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </SelectField>
          <SelectField
            label="Project"
            help="Defaults to Personal"
            value={project_id}
            onChange={e => setProjectId(e.target.value)}
            disabled={!owner_id}
            style={{
              background: !owner_id ? 'var(--surface-soft)' : 'var(--surface)',
              opacity: !owner_id ? 0.6 : 1,
            }}
          >
            <option value="">Personal (default)</option>
            {memberProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </SelectField>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Field
            label="Task *"
            value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && owner_id && text.trim()) create() }}
            placeholder="e.g. Pick up dry cleaning"
          />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
            <Field
              label="Due date"
              type="date"
              value={due_date}
                onChange={e => setDueDate(e.target.value)}
          </div>
          <Button onClick={create} disabled={creating || !owner_id || !text.trim()}>
            {creating
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Adding...</>
              : <><Plus size={14} /> Add Task</>}
          </Button>
        </div>
        {error && <Alert tone="danger" style={{ marginTop: 12 }}>{error}</Alert>}
      </Card>

      {loading ? (
        <LoadingState label="Loading tasks..." />
      ) : grouped.length === 0 ? (
        <EmptyState title="No open tasks yet">
          Add a task above and it will show up on the right family dashboards.
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
                    {g.tasks.length} task{g.tasks.length === 1 ? '' : 's'}
                  </StatusPill>
                </div>
                <div>
                  {g.tasks.map(t => (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', borderBottom: '1px solid var(--border)',
                    }}>
                      <button onClick={() => complete(t.id)}
                        aria-label={`Mark ${t.text} complete`}
                        title={`Mark ${t.text} complete`}
                        style={{
                          width: 20, height: 20, borderRadius: '50%',
                          border: '1.5px solid var(--border-strong)', background: 'var(--surface)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--text)' }}>{t.text}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                          {t.project && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {t.project.name}
                            </span>
                          )}
                          {t.due_date && (
                            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                              Due {fmtDate(t.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <IconButton label={`Delete ${t.text}`} onClick={() => remove(t.id)}>
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
