'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'

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
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#F7F4EF', minHeight: '100vh', padding: 24,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <a href="/manage" style={{ fontSize: 13, color: '#8B8599', textDecoration: 'none' }}>← Back to manage</a>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1A1A2E', margin: '4px 0 6px' }}>
            Tasks
          </h1>
          <p style={{ fontSize: 14, color: '#8B8599', margin: 0 }}>
            Add tasks for any family member. They show up in that person's column on the kitchen TV and on their personal display.
          </p>
        </div>

        <div style={{
          background: '#fff', border: '1px solid #E8E3DB', borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
                For whom *
              </label>
              <select value={owner_id}
                onChange={e => { setOwnerId(e.target.value); setProjectId('') }}
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
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
                Project (optional — defaults to Personal)
              </label>
              <select value={project_id}
                onChange={e => setProjectId(e.target.value)}
                disabled={!owner_id}
                style={{
                  width: '100%', border: '1.5px solid #E2DDD6', borderRadius: 7,
                  padding: '9px 10px', fontSize: 14, fontFamily: 'inherit',
                  background: !owner_id ? '#FAFAF7' : '#fff',
                  opacity: !owner_id ? 0.5 : 1,
                }}>
                <option value="">Personal (default)</option>
                {memberProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
              Task *
            </label>
            <input value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && owner_id && text.trim()) create() }}
              placeholder="e.g. Pick up dry cleaning"
              style={{
                width: '100%', border: '1.5px solid #E2DDD6', borderRadius: 7,
                padding: '9px 10px', fontSize: 14, fontFamily: 'inherit',
              }} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8599', display: 'block', marginBottom: 4 }}>
                Due date (optional)
              </label>
              <input type="date" value={due_date}
                onChange={e => setDueDate(e.target.value)}
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
                : <><Plus size={14} /> Add Task</>}
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
            No open tasks yet. Add one above.
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
                    {g.tasks.length} task{g.tasks.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div>
                  {g.tasks.map(t => (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', borderBottom: '1px solid #F0EDE8',
                    }}>
                      <button onClick={() => complete(t.id)}
                        title="Mark complete"
                        style={{
                          width: 20, height: 20, borderRadius: '50%',
                          border: '1.5px solid #DDD8CF', background: '#fff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: '#1A1A2E' }}>{t.text}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                          {t.project && (
                            <span style={{ fontSize: 11, color: '#8B8599' }}>
                              {t.project.name}
                            </span>
                          )}
                          {t.due_date && (
                            <span style={{ fontSize: 11, color: '#C4522A', fontWeight: 500 }}>
                              Due {fmtDate(t.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => remove(t.id)}
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
