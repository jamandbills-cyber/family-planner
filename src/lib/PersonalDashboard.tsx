'use client'

import { useEffect, useState } from 'react'
import type { FamilyMember, Project, Task, Idea } from '@/lib/types/dashboard'
import type { WeekRange } from '@/lib/types/calendar'
import WeekCalendar from '@/lib/WeekCalendar'

type Props = {
  member: FamilyMember
  projects: (Project & { tasks: Task[] })[]
  ideas: Idea[]
  calendar: WeekRange | null
  members: { id: string; display_name: string; color: string | null }[]
}

export default function PersonalDashboard({ member, projects, ideas, calendar, members }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(t)
  }, [])

  const isDark = now.getHours() >= 19 || now.getHours() < 7
  const theme = isDark ? {
    bg: '#0F0F1A', card: '#1E1E2E', border: '#2A2A3A',
    text: '#F0EDE7', subtext: '#8B8599',
  } : {
    bg: '#F7F4EF', card: '#fff', border: '#E2DDD6',
    text: '#1A1A2E', subtext: '#8B8599',
  }

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const timeLabel = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      fontFamily: "'DM Sans', sans-serif",
      padding: '20px 24px',
      color: theme.text,
      transition: 'background 0.5s, color 0.5s',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 18,
      }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 500 }}>{dateLabel}</span>
          <span style={{ fontSize: 16, color: theme.subtext, marginLeft: 12 }}>{timeLabel}</span>
        </div>
        <span style={{ fontSize: 14, color: theme.subtext }}>
          {member.display_name}
        </span>
      </div>

      {/* Calendar */}
      <div style={{ marginBottom: 16 }}>
        {calendar ? (
          <WeekCalendar
            events={calendar.events}
            syncedAt={calendar.syncedAt}
            weekStart={calendar.weekStart}
            density="comfortable"
            poll={true}
            members={members}
            darkMode={isDark}
          />
        ) : (
          <div style={{
            background: theme.card, border: `1px solid ${theme.border}`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 13, color: '#DC2626', fontStyle: 'italic' }}>
              Calendar unavailable. Check that the family calendar is shared with the
              service account.
            </div>
          </div>
        )}
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <div style={{
          background: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: 20, textAlign: 'center',
          color: theme.subtext, fontSize: 14,
        }}>
          No projects yet. Visit <a href="/admin/projects" style={{ color: '#C4522A' }}>/admin/projects</a> to add one.
        </div>
      ) : (
        <div style={{ columnCount: 2, columnGap: 12, marginBottom: 14 }}>
          {projects.map(p => (
            <div key={p.id} style={{
              breakInside: 'avoid', marginBottom: 12,
              background: theme.card, border: `1px solid ${theme.border}`,
              borderRadius: 12, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: p.color ?? '#888780', flexShrink: 0,
                }} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                {p.is_shared && (
                  <span style={{ fontSize: 11, color: theme.subtext,
                                 background: isDark ? '#2A2A3A' : '#F7F4EF',
                                 padding: '1px 7px', borderRadius: 4 }}>
                    shared
                  </span>
                )}
                <span style={{ fontSize: 12, color: theme.subtext, marginLeft: 'auto' }}>
                  {p.tasks.length} open
                </span>
              </div>
              {p.tasks.length === 0 ? (
                <div style={{ fontSize: 13, color: theme.subtext, fontStyle: 'italic', paddingLeft: 18 }}>
                  No tasks
                </div>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.85 }}>
                  {p.tasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', gap: 6 }}>
                      <span style={{ color: theme.subtext }}>·</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{t.text}</span>
                      {t.due_date && (
                        <span style={{ color: '#C4522A', fontSize: 12, fontWeight: 500 }}>
                          {new Date(t.due_date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ideas */}
      {ideas.length > 0 && (
        <div style={{
          background: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 13, color: theme.subtext, fontWeight: 500, marginBottom: 8 }}>
            Ideas
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: theme.text }}>
            {ideas.map(i => <div key={i.id}>{i.text}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}
