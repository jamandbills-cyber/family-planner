'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { ChevronUp, ChevronDown, ArrowLeft, Plus, Trash2 } from 'lucide-react'

type Task = {
  id: string
  text: string
  due_date: string | null
  completed_at: string | null
  position: number | null
  owner_id: string
}
type Member = { id: string; display_name: string; color: string | null }

export default function MemberInputPage() {
  return (
    <Suspense fallback={<LoadingFrame />}>
      <MemberContent />
    </Suspense>
  )
}

function LoadingFrame() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F4EF',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#8B8599', fontSize: 14,
    }}>
      Loading…
    </div>
  )
}

function MemberContent() {
  const params      = useSearchParams()
  const routeParams = useParams()
  const token    = params.get('d')
  const memberId = routeParams.memberId as string

  const [member, setMember]     = useState<Member | null>(null)
  const [tasks, setTasks]       = useState<Task[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [newText, setNewText]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId]     = useState<string | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  const tokenParam = token ? `?d=${encodeURIComponent(token)}` : ''

  const safeJson = async (res: Response) => {
    const text = await res.text()
    if (!text) return {}
    try { return JSON.parse(text) } catch { return { error: text } }
  }

  const load = async () => {
    if (!token || !memberId) { setLoading(false); return }
    setError(null)
    try {
      const [mRes, tRes] = await Promise.all([
        fetch(`/api/i/family?d=${encodeURIComponent(token)}`),
        fetch(`/api/i/tasks?d=${encodeURIComponent(token)}&owner_id=${encodeURIComponent(memberId)}`),
      ])
      const mData = await safeJson(mRes)
      const tData = await safeJson(tRes)
      if (!tRes.ok) throw new Error(tData.error ?? 'Failed to load tasks')
      const found = (mData.members ?? []).find((m: Member) => m.id === memberId)
      setMember(found ?? null)
      setTasks(tData.tasks ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token, memberId])

  const addTask = async () => {
    const text = newText.trim()
    if (!text || !token) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/i/tasks${tokenParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: memberId, text }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setTasks(t => [...t, data.task])
      setNewText('')
      inputRef.current?.focus()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const complete = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/i/tasks/${id}${tokenParam}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.error ?? 'Failed')
      }
      setTasks(ts => ts.filter(t => t.id !== id))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const move = async (id: string, direction: 'up' | 'down') => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/i/tasks/${id}${tokenParam}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ move: direction }),
      })
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.error ?? 'Failed')
      }
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this task?')) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/i/tasks/${id}${tokenParam}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.error ?? 'Failed')
      }
      setTasks(ts => ts.filter(t => t.id !== id))
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!token) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <p>Missing device token. Please scan the QR again.</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F4EF',
      fontFamily: "'DM Sans', sans-serif",
      padding: 16,
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12,
        }}>
          <a href={`/i/picker${tokenParam}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 14, color: '#8B8599', textDecoration: 'none',
              padding: '8px 4px',
            }}>
            <ArrowLeft size={16} /> Back
          </a>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 4px 16px',
        }}>
          <div style={{
            width: 10, height: 36, borderRadius: 5,
            background: member?.color ?? '#888780',
          }} />
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 30, fontWeight: 700, color: '#1A1A2E',
            margin: 0, lineHeight: 1.0,
          }}>
            {member?.display_name ?? '…'}
          </h1>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px', background: '#FEF2F2',
            border: '1px solid #FECACA', borderRadius: 10,
            color: '#DC2626', fontSize: 14, marginBottom: 12,
          }}>
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#8B8599' }}>Loading…</div>
        ) : tasks.length === 0 ? (
          <div style={{
            padding: 30, textAlign: 'center', color: '#8B8599',
            background: '#fff', border: '1px dashed #DDD8CF', borderRadius: 12,
            marginBottom: 12, fontSize: 14,
          }}>
            No tasks yet. Add one below.
          </div>
        ) : (
          <div style={{
            background: '#fff', border: '1px solid #E8E3DB',
            borderRadius: 12, overflow: 'hidden', marginBottom: 12,
          }}>
            {tasks.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 14px',
                borderBottom: i < tasks.length - 1 ? '1px solid #F0EDE8' : 'none',
                opacity: busyId === t.id ? 0.5 : 1,
              }}>
                <button onClick={() => complete(t.id)}
                  disabled={busyId === t.id}
                  title="Mark complete"
                  style={{
                    width: 28, height: 28, minWidth: 28,
                    borderRadius: '50%',
                    border: '1.5px solid #C4B8A8', background: '#fff',
                    cursor: 'pointer', flexShrink: 0,
                  }} />
                <div style={{
                  flex: 1, minWidth: 0,
                  fontSize: 16, color: '#1A1A2E',
                  wordBreak: 'break-word', lineHeight: 1.35,
                }}>
                  {t.text}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => move(t.id, 'up')}
                    disabled={i === 0 || busyId === t.id}
                    title="Move up"
                    style={{
                      width: 32, height: 28,
                      background: 'none', border: 'none',
                      cursor: i === 0 ? 'default' : 'pointer',
                      color: i === 0 ? '#E2DDD6' : '#8B8599',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}>
                    <ChevronUp size={18} />
                  </button>
                  <button onClick={() => move(t.id, 'down')}
                    disabled={i === tasks.length - 1 || busyId === t.id}
                    title="Move down"
                    style={{
                      width: 32, height: 28,
                      background: 'none', border: 'none',
                      cursor: i === tasks.length - 1 ? 'default' : 'pointer',
                      color: i === tasks.length - 1 ? '#E2DDD6' : '#8B8599',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}>
                    <ChevronDown size={18} />
                  </button>
                </div>
                <button onClick={() => remove(t.id)}
                  disabled={busyId === t.id}
                  title="Delete"
                  style={{
                    width: 36, height: 36,
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: '#C4B8A8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{
          background: '#fff', border: '1px solid #E8E3DB',
          borderRadius: 12, padding: 12,
          display: 'flex', gap: 8,
        }}>
          <input
            ref={inputRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newText.trim()) addTask() }}
            placeholder="Add a task…"
            disabled={submitting}
            style={{
              flex: 1, minWidth: 0,
              border: '1.5px solid #E2DDD6', borderRadius: 8,
              padding: '11px 12px', fontSize: 16,
              fontFamily: 'inherit',
              background: '#fff', color: '#1A1A2E',
            }}
          />
          <button onClick={addTask}
            disabled={!newText.trim() || submitting}
            style={{
              background: '#C4522A', color: '#fff', border: 'none',
              borderRadius: 8, padding: '0 16px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', flexShrink: 0,
              opacity: (!newText.trim() || submitting) ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              minHeight: 44,
            }}>
            <Plus size={16} /> Add
          </button>
        </div>

        <div style={{ height: 24 }} />
        <a href={`/i/picker${tokenParam}`}
          style={{
            display: 'block', textAlign: 'center',
            fontSize: 14, color: '#8B8599', textDecoration: 'none',
            padding: '12px 0',
          }}>
          ← Back to people
        </a>
      </div>
    </div>
  )
}
