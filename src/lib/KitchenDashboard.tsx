'use client'

import type { FamilyMember } from '@/lib/types/dashboard'
import type { WeekRange } from '@/lib/types/calendar'
import WeekCalendar from '@/lib/WeekCalendar'

type KitchenColumn = {
  member: FamilyMember
  tasks: { id: string; text: string; due_date: string | null; project: { name: string; color: string | null } | null }[]
  ideas: { id: string; text: string }[]
}

type Props = {
  columns: KitchenColumn[]
  calendar: WeekRange | null
}

export default function KitchenDashboard({ columns, calendar }: Props) {
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
      padding: '16px 20px',
      color: '#1A1A2E',
      display: 'grid',
      gridTemplateColumns: '1fr 200px',
      gap: 14,
    }}>
      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        {/* Calendar */}
        {calendar ? (
          <WeekCalendar
            events={calendar.events}
            syncedAt={calendar.syncedAt}
            weekStart={calendar.weekStart}
            density="compact"
            poll={true}
          />
        ) : (
          <div style={{
            background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: 12, color: '#DC2626', fontStyle: 'italic' }}>
              Calendar unavailable
            </div>
          </div>
        )}

        {/* Person columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, 1fr)`,
          gap: 6,
        }}>
          {columns.map(col => (
            <div key={col.member.id} style={{
              background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 8,
              overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                height: 4, background: col.member.color ?? '#888780',
              }} />
              <div style={{ padding: '6px 8px 4px', fontSize: 13, fontWeight: 500 }}>
                {col.member.display_name}
              </div>
              <div style={{ padding: '0 8px 6px', fontSize: 11, lineHeight: 1.5, color: '#4A4A5A', flex: 1 }}>
                {col.tasks.length === 0 ? (
                  <div style={{ color: '#A8A39B', fontStyle: 'italic' }}>—</div>
                ) : (
                  col.tasks.map(t => (
                    <div key={t.id} style={{ marginBottom: 2 }}>· {t.text}</div>
                  ))
                )}
              </div>
              {col.ideas.length > 0 && (
                <div style={{
                  padding: '4px 8px',
                  fontSize: 10, color: '#8B8599',
                  borderTop: '0.5px dashed #E2DDD6',
                }}>
                  {col.ideas.length} idea{col.ideas.length === 1 ? '' : 's'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 8,
          padding: '12px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{dateLabel.split(',')[0]}</div>
          <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.1, marginTop: 2 }}>
            {timeLabel}
          </div>
          <div style={{ fontSize: 11, color: '#8B8599', marginTop: 4 }}>
            {dateLabel.split(',').slice(1).join(',').trim()}
          </div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #C0DD97, #9FE1CB)',
          borderRadius: 8, aspectRatio: '1 / 1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#04342C', fontStyle: 'italic',
        }}>
          family photo
        </div>
        <div style={{
          background: '#fff', border: '0.5px solid #E2DDD6', borderRadius: 8,
          padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <div style={{
            width: 100, height: 100,
            background: 'repeating-conic-gradient(#1A1A2E 0% 25%, transparent 0% 50%)',
            backgroundSize: '8px 8px', borderRadius: 4,
          }} />
          <div style={{ fontSize: 10, color: '#8B8599', marginTop: 4 }}>scan to add</div>
        </div>
      </div>
    </div>
  )
}
