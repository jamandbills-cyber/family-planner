'use client'

import { useEffect, useState } from 'react'
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
  members: { id: string; display_name: string; color: string | null }[]
}

export default function KitchenDashboard({ columns, calendar, members }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(t)
  }, [])

  // Auto dark mode 7 PM - 7 AM
  const isDark = now.getHours() >= 19 || now.getHours() < 7

  const theme = isDark ? {
    bg:       '#0F0F1A',
    card:     '#1E1E2E',
    border:   '#2A2A3A',
    text:     '#F0EDE7',
    subtext:  '#8B8599',
    railBg:   '#1A1A26',
  } : {
    bg:       '#F7F4EF',
    card:     '#fff',
    border:   '#E2DDD6',
    text:     '#1A1A2E',
    subtext:  '#8B8599',
    railBg:   '#fff',
  }

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // Filter columns to only show people with tasks/ideas — saves space
  const columnsWithStuff = columns.filter(c => c.tasks.length > 0 || c.ideas.length > 0)
  const showColumns = columnsWithStuff.length > 0 ? columnsWithStuff : columns

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      fontFamily: "'DM Sans', sans-serif",
      padding: 20,
      color: theme.text,
      display: 'grid',
      gridTemplateColumns: '1fr 280px',
      gap: 18,
      transition: 'background 0.5s, color 0.5s',
    }}>
      {/* Main area: calendar + family columns */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        {calendar ? (
          <WeekCalendar
            events={calendar.events}
            syncedAt={calendar.syncedAt}
            weekStart={calendar.weekStart}
            density="tv"
            poll={true}
            members={members}
            darkMode={isDark}
          />
        ) : (
          <div style={{
            background: theme.card, border: `1px solid ${theme.border}`,
            borderRadius: 10, padding: '20px 24px',
          }}>
            <div style={{ fontSize: 16, color: '#DC2626', fontStyle: 'italic' }}>
              Calendar unavailable
            </div>
          </div>
        )}

        {/* Family columns - taller, bigger text */}
        {columnsWithStuff.length === 0 ? null : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(showColumns.length, 1)}, 1fr)`,
            gap: 10,
          }}>
            {showColumns.map(col => (
              <div key={col.member.id} style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 10, overflow: 'hidden', minWidth: 0,
                display: 'flex', flexDirection: 'column',
                minHeight: 140,
              }}>
                <div style={{ height: 6, background: col.member.color ?? '#888780' }} />
                <div style={{ padding: '10px 12px 6px', fontSize: 20, fontWeight: 600 }}>
                  {col.member.display_name}
                </div>
                <div style={{ padding: '0 12px 10px', fontSize: 15,
                              lineHeight: 1.5, color: theme.text, flex: 1 }}>
                  {col.tasks.length === 0 ? (
                    <div style={{ color: theme.subtext, fontStyle: 'italic', fontSize: 14 }}>—</div>
                  ) : (
                    col.tasks.map(t => (
                      <div key={t.id} style={{ marginBottom: 4 }}>· {t.text}</div>
                    ))
                  )}
                </div>
                {col.ideas.length > 0 && (
                  <div style={{
                    padding: '6px 12px', fontSize: 13, color: theme.subtext,
                    borderTop: `1px dashed ${theme.border}`,
                  }}>
                    {col.ideas.length} idea{col.ideas.length === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right rail: hero clock, photo, QR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Clock — the hero */}
        <div style={{
          background: theme.railBg, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: theme.subtext,
                        textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {dayName}
          </div>
          <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.0,
                        marginTop: 6, marginBottom: 6,
                        fontFamily: "'Playfair Display', serif",
                        color: theme.text, letterSpacing: '-0.02em' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 18, color: theme.subtext, fontWeight: 500 }}>
            {dateStr}
          </div>
        </div>

        {/* Photo placeholder — bigger, less ugly */}
        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, #2A3A48, #1F4D44)'
            : 'linear-gradient(135deg, #C0DD97, #9FE1CB)',
          borderRadius: 12,
          aspectRatio: '4 / 3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: isDark ? '#9FE1CB' : '#04342C',
          fontStyle: 'italic',
          border: `1px solid ${theme.border}`,
        }}>
          family photo
        </div>

        {/* QR placeholder */}
        <div style={{
          background: theme.railBg, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 120, height: 120,
            background: isDark
              ? 'repeating-conic-gradient(#F0EDE7 0% 25%, transparent 0% 50%)'
              : 'repeating-conic-gradient(#1A1A2E 0% 25%, transparent 0% 50%)',
            backgroundSize: '10px 10px', borderRadius: 6,
          }} />
          <div style={{ fontSize: 14, color: theme.subtext, fontWeight: 500 }}>
            scan to add
          </div>
        </div>
      </div>
    </div>
  )
}
