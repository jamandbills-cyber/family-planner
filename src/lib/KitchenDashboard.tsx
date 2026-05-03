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

  const isDark = now.getHours() >= 19 || now.getHours() < 7

  const theme = isDark ? {
    bg: '#0F0F1A', card: '#1E1E2E', border: '#2A2A3A',
    text: '#F0EDE7', subtext: '#8B8599', railBg: '#1A1A26',
    cardSubtle: '#15151F',
  } : {
    bg: '#F7F4EF', card: '#fff', border: '#E2DDD6',
    text: '#1A1A2E', subtext: '#8B8599', railBg: '#fff',
    cardSubtle: '#F7F4EF',
  }

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      fontFamily: "'DM Sans', sans-serif",
      padding: 18,
      color: theme.text,
      display: 'grid',
      gridTemplateColumns: '1fr 260px',
      gap: 16,
      transition: 'background 0.5s, color 0.5s',
    }}>
      {/* Main area: calendar on top, eight family columns below — both substantial */}
      <div style={{ display: 'grid',
                    gridTemplateRows: '1fr auto',
                    gap: 14, minWidth: 0, minHeight: 0 }}>
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
              Calendar unavailable — check that the family calendar is shared
              with the service account and Sunday Plan has saved data for this week.
            </div>
          </div>
        )}

        {/* Eight family columns - always visible, every person */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
          gap: 8,
        }}>
          {columns.map(col => (
            <div key={col.member.id} style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 10, overflow: 'hidden', minWidth: 0,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ height: 6, background: col.member.color ?? '#888780' }} />
              <div style={{
                padding: '10px 12px 6px', fontSize: 22, fontWeight: 700,
                color: theme.text, lineHeight: 1.1,
              }}>
                {col.member.display_name}
              </div>
              <div style={{
                padding: '0 12px 12px', flex: 1,
                fontSize: 14, lineHeight: 1.4, color: theme.text,
              }}>
                {col.tasks.length === 0 && col.ideas.length === 0 ? (
                  <div style={{ color: theme.subtext, fontStyle: 'italic',
                                fontSize: 13, paddingTop: 4 }}>
                    nothing
                  </div>
                ) : (
                  <>
                    {col.tasks.map(t => (
                      <div key={t.id} style={{
                        display: 'flex', gap: 6, marginBottom: 6,
                        fontSize: 14, lineHeight: 1.4,
                      }}>
                        <span style={{ color: theme.subtext, flexShrink: 0 }}>·</span>
                        <span style={{ wordBreak: 'break-word' }}>{t.text}</span>
                      </div>
                    ))}
                    {col.ideas.length > 0 && (
                      <div style={{
                        marginTop: col.tasks.length > 0 ? 8 : 0,
                        paddingTop: col.tasks.length > 0 ? 8 : 0,
                        borderTop: col.tasks.length > 0
                          ? `1px dashed ${theme.border}` : 'none',
                        fontSize: 12, color: theme.subtext,
                      }}>
                        {col.ideas.length} idea{col.ideas.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          background: theme.railBg, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: '20px 18px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: theme.subtext,
                        textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {dayName}
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.0,
                        marginTop: 4, marginBottom: 4,
                        fontFamily: "'Playfair Display', serif",
                        color: theme.text, letterSpacing: '-0.02em' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 16, color: theme.subtext, fontWeight: 500 }}>
            {dateStr}
          </div>
        </div>

        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, #2A3A48, #1F4D44)'
            : 'linear-gradient(135deg, #C0DD97, #9FE1CB)',
          borderRadius: 12, aspectRatio: '4 / 3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: isDark ? '#9FE1CB' : '#04342C',
          fontStyle: 'italic',
          border: `1px solid ${theme.border}`,
        }}>
          family photo
        </div>

        <div style={{
          background: theme.railBg, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: 14,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 110, height: 110,
            background: isDark
              ? 'repeating-conic-gradient(#F0EDE7 0% 25%, transparent 0% 50%)'
              : 'repeating-conic-gradient(#1A1A2E 0% 25%, transparent 0% 50%)',
            backgroundSize: '10px 10px', borderRadius: 6,
          }} />
          <div style={{ fontSize: 13, color: theme.subtext, fontWeight: 500 }}>
            scan to add
          </div>
        </div>
      </div>
    </div>
  )
}
