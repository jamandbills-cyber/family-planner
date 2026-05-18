'use client'

import { useState } from 'react'
import type { Project, Task } from '@/lib/types/dashboard'
import { Alert, Button, Card, Field, IconButton, PageHeader, PageShell, SelectField, StatusPill } from '@/components/ui'

type Member = { id: string; display_name: string; color: string | null }

type Props = {
  initialProjects: Project[]
  initialTasks: Task[]
  members: Member[]
}

export default function ProjectsAdminClient({ initialProjects, initialTasks, members }: Props) {
  const [projects, setProjects] = useState(initialProjects)
  const [tasks, setTasks] = useState(initialTasks)
  const [adding, setAdding] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const addProject = async (form: FormData) => {
    setErrMsg('')
    const body = {
      name:      form.get('name'),
      color:     form.get('color') || null,
      owner_id:  form.get('owner_id'),
      is_shared: form.get('is_shared') === 'on',
    }
    const res = await fetch('/api/admin/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setErrMsg(data.error || 'Failed'); return }
    setProjects([...projects, data.project])
    setAdding(false)
  }

  const updateProject = async (id: string, patch: Partial<Project>) => {
    setErrMsg('')
    const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setProjects(projects.map(p => p.id === id ? { ...p, ...(data.project ?? patch) } : p))
    else setErrMsg(data.error ?? 'Failed to update project')
  }

  const archiveProject = async (id: string) => {
    if (!confirm('Archive this project? Tasks under it stop showing on dashboards.')) return
    setErrMsg('')
    const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setProjects(projects.filter(p => p.id !== id))
    else setErrMsg(data.error ?? 'Failed to archive project')
  }

  const addTask = async (projectId: string, text: string, ownerId: string, dueDate: string | null) => {
    if (!text.trim()) return
    const res = await fetch('/api/admin/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId, text: text.trim(), owner_id: ownerId, due_date: dueDate,
      }),
    })
    const data = await res.json()
    if (res.ok) setTasks([data.task, ...tasks])
  }

  const completeTask = async (id: string) => {
    setErrMsg('')
    const res = await fetch(`/api/admin/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setTasks(tasks.filter(t => t.id !== id))
    else setErrMsg(data.error ?? 'Failed to complete task')
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return
    setErrMsg('')
    const res = await fetch(`/api/admin/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setTasks(tasks.filter(t => t.id !== id))
    else setErrMsg(data.error ?? 'Failed to delete task')
  }

  return (
    <PageShell>
      <PageHeader
        title="Projects"
        description="Group related tasks and decide whether a project appears for one person or the whole family."
        actions={!adding && <Button onClick={() => setAdding(true)}>Add project</Button>}
      />
      {errMsg && <Alert tone="danger" style={{ marginBottom: 16 }}>{errMsg}</Alert>}

      <div style={{ display: 'grid', gap: 14 }}>
        {projects.map(p => {
          const ownerMember = members.find(m => m.id === p.owner_id)
          const myTasks = tasks.filter(t => t.project_id === p.id)
          return (
            <ProjectCard
              key={p.id}
              project={p}
              tasks={myTasks}
              members={members}
              ownerName={ownerMember?.display_name ?? p.owner_id}
              onUpdate={(patch) => updateProject(p.id, patch)}
              onArchive={() => archiveProject(p.id)}
              onAddTask={(text, ownerId, dueDate) => addTask(p.id, text, ownerId, dueDate)}
              onCompleteTask={completeTask}
              onDeleteTask={deleteTask}
            />
          )
        })}
      </div>

      {adding ? (
        <Card style={{ marginTop: 16 }}>
          <form action={addProject}>
            <h2 style={{ color: 'var(--text)', fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 12 }}>New project</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Field name="name" label="Project name" required />
              <Field name="color" label="Color" type="color" defaultValue="#7F77DD" style={{ padding: 4, height: 42 }} />
              <SelectField name="owner_id" label="Owner" required>
              <option value="">Owner...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </SelectField>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <input type="checkbox" name="is_shared" />
              Shared (shows on every family dashboard)
            </label>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button type="submit">Add project</Button>
              <Button variant="secondary" onClick={() => { setAdding(false); setErrMsg('') }}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : null}
    </PageShell>
  )
}

// ─── Single project card with inline task editor ───────────────────
function ProjectCard({ project, tasks, members, ownerName, onUpdate, onArchive,
                      onAddTask, onCompleteTask, onDeleteTask }: any) {
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskOwner, setNewTaskOwner] = useState(project.owner_id)
  const [newTaskDate, setNewTaskDate] = useState('')

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input type="color" defaultValue={project.color ?? '#888'}
          onBlur={e => onUpdate({ color: e.target.value })}
          aria-label={`${project.name} color`}
          style={{ width: 30, height: 30, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', padding: 0 }} />
        <input defaultValue={project.name}
          onBlur={e => onUpdate({ name: e.target.value })}
          style={{ flex: 1, padding: '6px 8px', fontSize: 14, fontWeight: 500,
                   border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', minWidth: 180 }} />
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
          <input type="checkbox" defaultChecked={project.is_shared}
            onChange={e => onUpdate({ is_shared: e.target.checked })} />
          shared
        </label>
        <StatusPill>{ownerName}</StatusPill>
        <Button variant="ghost" onClick={onArchive} style={{ color: 'var(--danger)' }}>
          Archive
        </Button>
      </div>

      {/* Tasks */}
      <div style={{ paddingLeft: 8, fontSize: 13 }}>
        {tasks.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
            No tasks yet
          </div>
        ) : (
          tasks.map((t: Task) => {
            const owner = members.find((m: Member) => m.id === t.owner_id)
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <button onClick={() => onCompleteTask(t.id)}
                  aria-label={`Mark ${t.text} complete`}
                  title={`Mark ${t.text} complete`}
                  style={{ width: 16, height: 16, border: '1.5px solid var(--border-strong)', borderRadius: 3,
                           background: 'var(--surface)', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.text}</span>
                {t.due_date && (
                  <span style={{ fontSize: 11, color: 'var(--accent)' }}>
                    {new Date(t.due_date).toLocaleDateString()}
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {owner?.display_name ?? t.owner_id}
                </span>
                <IconButton label={`Delete ${t.text}`} onClick={() => onDeleteTask(t.id)} style={{ minHeight: 28, minWidth: 28, color: 'var(--danger)' }}>
                  ✕
                </IconButton>
              </div>
            )
          })
        )}
      </div>

      {/* New task row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 8, marginTop: 12, paddingTop: 12,
        borderTop: '1px dashed var(--border)',
      }}>
        <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)}
          placeholder="New task..." style={{ flex: 1, padding: '6px 10px', fontSize: 12,
            border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit' }} />
        <select value={newTaskOwner} onChange={e => setNewTaskOwner(e.target.value)}
          style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--border-strong)',
                   borderRadius: 'var(--radius-md)', fontFamily: 'inherit' }}>
          {members.map((m: Member) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
        <input type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)}
          style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--border-strong)',
                   borderRadius: 'var(--radius-md)', fontFamily: 'inherit' }} />
        <Button onClick={() => {
          onAddTask(newTaskText, newTaskOwner, newTaskDate || null)
          setNewTaskText(''); setNewTaskDate('')
        }} style={{ padding: '7px 12px', fontSize: 12 }}>
          Add
        </Button>
      </div>
    </Card>
  )
}

type _UnusedMember = Member
