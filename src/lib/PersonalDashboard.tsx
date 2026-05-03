'use client'

import type { FamilyMember, Project, Task, Idea } from '@/lib/types/dashboard'
import type { WeekRange } from '@/lib/types/calendar'
import WeekCalendar from '@/lib/WeekCalendar'

type Props = {
  member: FamilyMember
  projects: (Project & { tasks: Task[] })[]
  ideas: Idea[]
  calendar: WeekRange | null
}

export default function PersonalDashboard({ member, projects, ideas, calendar }: Props) {
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const timeLabel = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F4EF',
      fontFamily: "'DM Sans', sans-serif",
      padding: '20px 24px',
      color: '#1A1A2E',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 16,
      }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 500 }}>{dateLabel}</span>
          <span style={{ fontSize: 14, color: '#8B8599', marginLeft: 10 }}>{timeLabel}</span>
        </div>
        <span style={{ fontSize: 13, color: '#8B8599' }}>
          {member.display_name}
        </span>
      </div>

      {/* Calendar */}
      <div style={{ marginBottom: 14 }}>
        {calendar ? (
          <WeekCalendar
            events={calendar.events}
            syncedAt={calendar.syncedAt}
            weekStart={calendar.weekStart}
            density="comfortable"
            poll={true}
          />
        ) : (
          <div style={{
            background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 12,
            padding: '14px 16px',
          }}>
            <div style={{ fontSize: 12, color: '#8B8599', fontWeight: 500, marginBottom: 8 }}>
              This week
            </div>
            <div style={{ fontSize: 13, color: '#DC2626', fontStyle: 'italic' }}>
              Calendar unavailable. Check that the family calendar is shared with the
              service account, and Google Calendar API is enabled.
            </div>
          </div>
        )}
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <div style={{
          background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 12,
          padding: 20, textAlign: 'center', color: '#8B8599', fontSize: 14,
        }}>
          No projects yet. Visit <a href="/admin/projects" style={{ color: '#C4522A' }}>/admin/projects</a> to add one.
        </div>
      ) : (
        <div style={{ columnCount: 2, columnGap: 10, marginBottom: 14 }}>
          {projects.map(p => (
            <div key={p.id} style={{
              breakInside: 'avoid', marginBottom: 10,
              background: '#fff', border: '0.5px solid #E2DDD6',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: p.color ?? '#888780', flexShrink: 0,
                }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                {p.is_shared && (
                  <span style={{ fontSize: 10, color: '#8B8599', background: '#F7F4EF',
                                 padding: '1px 6px', borderRadius: 4 }}>
                    shared
                  </span>
                )}
                <span style={{ fontSize: 11, color: '#8B8599', marginLeft: 'auto' }}>
                  {p.tasks.length} open
                </span>
              </div>
              {p.tasks.length === 0 ? (
                <div style={{ fontSize: 12, color: '#A8A39B', fontStyle: 'italic', paddingLeft: 17 }}>
                  No tasks
                </div>
              ) : (
                <div style={{ fontSize: 13, lineHeight: 1.85 }}>
                  {p.tasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', gap: 6 }}>
                      <span style={{ color: '#A8A39B' }}>·</span>
                      <span style={{ flex: 1, minWidth: 0 }}>{t.text}</span>
                      {t.due_date && (
                        <span style={{ color: '#C4522A', fontSize: 11, fontWeight: 500 }}>
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
          background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 12,
          padding: '12px 14px',
        }}>
          <div style={{ fontSize: 12, color: '#8B8599', fontWeight: 500, marginBottom: 8 }}>
            Ideas
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: '#4A4A5A' }}>
            {ideas.map(i => <div key={i.id}>{i.text}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}
