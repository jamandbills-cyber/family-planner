'use client'

import { useState } from 'react'
import type { Project, Task } from '@/lib/types/dashboard'

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
    const res = await fetch('/api/admin/projects', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (res.ok) setProjects(projects.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  const archiveProject = async (id: string) => {
    if (!confirm('Archive this project? Tasks under it stop showing on dashboards.')) return
    const res = await fetch('/api/admin/projects', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'archived' }),
    })
    if (res.ok) setProjects(projects.filter(p => p.id !== id))
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
    const res = await fetch('/api/admin/tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, completed_at: new Date().toISOString() }),
    })
    if (res.ok) setTasks(tasks.filter(t => t.id !== id))
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return
    const res = await fetch('/api/admin/tasks', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setTasks(tasks.filter(t => t.id !== id))
  }

  const inputS: React.CSSProperties = {
    padding: '8px 10px', fontSize: 13, border: '1px solid #DDD8CF',
    borderRadius: 6, fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 24 }}>
        Projects
      </h1>

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

      {adding ? (
        <form action={addProject} style={{ background: '#F7F4EF', padding: 16, borderRadius: 8, marginTop: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>New project</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: 12 }}>
            <input name="name" placeholder="Project name" required style={inputS} />
            <input name="color" type="color" defaultValue="#7F77DD" style={{ ...inputS, padding: 4 }} />
            <select name="owner_id" required style={inputS}>
              <option value="">Owner...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13 }}>
            <input type="checkbox" name="is_shared" />
            Shared (shows on every family dashboard)
          </label>
          {errMsg && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 8 }}>{errMsg}</div>}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '8px 16px', background: '#C4522A', color: '#fff',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Add project
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
          style={{ marginTop: 16, padding: '10px 16px', background: '#1A1A2E', color: '#fff',
                   border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add project
        </button>
      )}
    </div>
  )
}

// ─── Single project card with inline task editor ───────────────────
function ProjectCard({ project, tasks, members, ownerName, onUpdate, onArchive,
                      onAddTask, onCompleteTask, onDeleteTask }: any) {
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskOwner, setNewTaskOwner] = useState(project.owner_id)
  const [newTaskDate, setNewTaskDate] = useState('')

  return (
    <div style={{
      background: '#fff', border: '1px solid #E2DDD6', borderRadius: 10,
      padding: 14, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <input type="color" defaultValue={project.color ?? '#888'}
          onBlur={e => onUpdate({ color: e.target.value })}
          style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
        <input defaultValue={project.name}
          onBlur={e => onUpdate({ name: e.target.value })}
          style={{ flex: 1, padding: '6px 8px', fontSize: 14, fontWeight: 500,
                   border: '1px solid transparent', borderRadius: 4, fontFamily: 'inherit' }} />
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#4A4A5A' }}>
          <input type="checkbox" defaultChecked={project.is_shared}
            onChange={e => onUpdate({ is_shared: e.target.checked })} />
          shared
        </label>
        <span style={{ fontSize: 11, color: '#8B8599' }}>owner: {ownerName}</span>
        <button onClick={onArchive}
          style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>
          Archive
        </button>
      </div>

      {/* Tasks */}
      <div style={{ paddingLeft: 8, fontSize: 13 }}>
        {tasks.length === 0 ? (
          <div style={{ color: '#A8A39B', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
            No tasks yet
          </div>
        ) : (
          tasks.map((t: Task) => {
            const owner = members.find((m: Member) => m.id === t.owner_id)
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <button onClick={() => onCompleteTask(t.id)}
                  title="Mark complete"
                  style={{ width: 16, height: 16, border: '1.5px solid #DDD8CF', borderRadius: 3,
                           background: '#fff', cursor: 'pointer', padding: 0 }} />
                <span style={{ flex: 1 }}>{t.text}</span>
                {t.due_date && (
                  <span style={{ fontSize: 11, color: '#C4522A' }}>
                    {new Date(t.due_date).toLocaleDateString()}
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#8B8599' }}>
                  {owner?.display_name ?? t.owner_id}
                </span>
                <button onClick={() => onDeleteTask(t.id)}
                  style={{ fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* New task row */}
      <div style={{
        display: 'flex', gap: 6, marginTop: 10, paddingTop: 10,
        borderTop: '0.5px dashed #E2DDD6',
      }}>
        <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)}
          placeholder="New task..." style={{ flex: 1, padding: '6px 10px', fontSize: 12,
            border: '1px solid #DDD8CF', borderRadius: 4, fontFamily: 'inherit' }} />
        <select value={newTaskOwner} onChange={e => setNewTaskOwner(e.target.value)}
          style={{ padding: '6px 8px', fontSize: 12, border: '1px solid #DDD8CF',
                   borderRadius: 4, fontFamily: 'inherit' }}>
          {members.map((m: Member) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
        <input type="date" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)}
          style={{ padding: '6px 8px', fontSize: 12, border: '1px solid #DDD8CF',
                   borderRadius: 4, fontFamily: 'inherit' }} />
        <button onClick={() => {
          onAddTask(newTaskText, newTaskOwner, newTaskDate || null)
          setNewTaskText(''); setNewTaskDate('')
        }} style={{ padding: '6px 12px', background: '#1A1A2E', color: '#fff', border: 'none',
                    borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          Add
        </button>
      </div>
    </div>
  )
}

type _UnusedMember = Member
