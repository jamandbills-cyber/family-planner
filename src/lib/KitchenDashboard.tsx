'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FamilyMember } from '@/lib/types/dashboard'
import type { WeekRange, DashboardCalendarEvent } from '@/lib/types/calendar'
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
  deviceToken?: string
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h < 12 ? 'AM' : 'PM'
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${hr} ${period}` : `${hr}:${String(m).padStart(2, '0')} ${period}`
}

export default function KitchenDashboard({
  columns: initialColumns,
  calendar,
  members: initialMembers,
  deviceToken,
}: Props) {
  const [columns, setColumns] = useState<KitchenColumn[]>(initialColumns)
  const [members, setMembers] = useState(initialMembers)
  const [now, setNow] = useState(new Date())

  // Poll for fresh tasks/ideas every 10 seconds — keeps the TV in sync
  // with admin actions without needing manual refresh.
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch('/api/dashboard/columns')
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.columns)) setColumns(data.columns)
        if (Array.isArray(data.members)) setMembers(data.members)
      } catch {}
    }
    const t = setInterval(refresh, 10_000)
    return () => clearInterval(t)
  }, [])
  const [photos, setPhotos] = useState<string[]>([])
  const [photoIdx, setPhotoIdx] = useState(0)
  const [photoVisible, setPhotoVisible] = useState(true)

  // Tick clock every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Load photos once on mount, refresh every 5 minutes
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/photos')
        const data = await res.json()
        setPhotos(data.photos ?? [])
      } catch {}
    }
    load()
    const t = setInterval(load, 5 * 60_000)
    return () => clearInterval(t)
  }, [])

  // Rotate photo every 3 minutes with a fade
  useEffect(() => {
    if (photos.length <= 1) return
    const rotate = setInterval(() => {
      setPhotoVisible(false)
      setTimeout(() => {
        setPhotoIdx(i => (i + 1) % photos.length)
        setPhotoVisible(true)
      }, 600)
    }, 3 * 60_000)
    return () => clearInterval(rotate)
  }, [photos.length])

  // Auto dark mode 7 PM – 7 AM
  const isDark = now.getHours() >= 19 || now.getHours() < 7

  const theme = isDark ? {
    bg: '#0F0F1A', card: '#1E1E2E', border: '#2A2A3A',
    text: '#F0EDE7', subtext: '#8B8599', railBg: '#1A1A26',
    muted: '#15151F',
  } : {
    bg: '#F7F4EF', card: '#fff', border: '#E2DDD6',
    text: '#1A1A2E', subtext: '#8B8599', railBg: '#fff',
    muted: '#F7F4EF',
  }

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  // Today's events from calendar
  const todayEvents = useMemo(() => {
    if (!calendar) return []
    const start = new Date(calendar.weekStart + 'T00:00:00')
    const todayIdx = Math.floor(
      (new Date(now.toDateString()).getTime() - start.getTime()) / 86400000
    )
    if (todayIdx < 0 || todayIdx > 6) return []
    const nowMin = now.getHours() * 60 + now.getMinutes()
    return calendar.events
      .filter((e: DashboardCalendarEvent) => e.dayIdx === todayIdx && !e.allDay)
      .filter((e: DashboardCalendarEvent) => e.endMinutes > nowMin - 30)
      .sort((a, b) => a.startMinutes - b.startMinutes)
      .slice(0, 6)
  }, [calendar, now])

  const memberById = useMemo(() => {
    const m = new Map<string, { display_name: string; color: string | null }>()
    members.forEach(mem => m.set(mem.id, mem))
    return m
  }, [members])

  const eventColor = (e: DashboardCalendarEvent): string => {
    if (e.isSchoolEvent) return '#FEF3C7'
    if (e.involvedIds && e.involvedIds.length > 0) {
      const first = members.find(m => e.involvedIds!.includes(m.id) && m.color)
      if (first?.color) return first.color
    }
    const titleLower = e.title.toLowerCase()
    for (const m of members) {
      if (!m.color) continue
      if (new RegExp(`\\b${m.display_name.toLowerCase()}\\b`).test(titleLower)) return m.color
    }
    return '#888780'
  }

  const qrSrc = deviceToken ? `/api/qr/${deviceToken}` : null

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: theme.bg, color: theme.text,
      fontFamily: "'DM Sans', sans-serif",
      display: 'grid',
      gridTemplateColumns: '1fr clamp(220px, 18vw, 280px)',
      gridTemplateRows: '1fr clamp(180px, 24vh, 280px)',
      gridTemplateAreas: `
        "calendar rail"
        "family   family"
      `,
      gap: 'clamp(8px, 1vh, 14px)',
      padding: 'clamp(8px, 1vh, 14px)',
      overflow: 'hidden',
      transition: 'background 0.5s, color 0.5s',
    }}>
      {/* CALENDAR */}
      <div style={{ gridArea: 'calendar', minWidth: 0, minHeight: 0, display: 'flex' }}>
        {calendar ? (
          <WeekCalendar
            events={calendar.events}
            syncedAt={calendar.syncedAt}
            weekStart={calendar.weekStart}
            density="tv"
            poll={true}
            members={members}
            darkMode={isDark}
            fillHeight
          />
        ) : (
          <div style={{
            flex: 1, background: theme.card, border: `1px solid ${theme.border}`,
            borderRadius: 12, padding: 24, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 16, color: '#DC2626', fontStyle: 'italic' }}>
              Calendar unavailable — check Sunday Plan setup for this week.
            </div>
          </div>
        )}
      </div>

      {/* RIGHT RAIL */}
      <div style={{
        gridArea: 'rail', minHeight: 0,
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr auto',
        gap: 'clamp(6px, 0.8vh, 12px)',
      }}>
        {/* Clock */}
        <div style={{
          background: theme.railBg, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: 'clamp(10px, 1.2vh, 18px)', textAlign: 'center',
        }}>
          <div style={{
            fontSize: 'clamp(11px, 0.95vw, 14px)', fontWeight: 600, color: theme.subtext,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {dayName}
          </div>
          <div style={{
            fontSize: 'clamp(40px, 4.2vw, 64px)', fontWeight: 700, lineHeight: 1.0,
            margin: '4px 0',
            fontFamily: "'Playfair Display', serif",
            color: theme.text, letterSpacing: '-0.02em',
          }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 'clamp(11px, 0.95vw, 14px)', color: theme.subtext, fontWeight: 500 }}>
            {dateStr}
          </div>
        </div>

        {/* Photo (letterbox) */}
        <div style={{
          background: isDark ? '#000' : '#1A1A2E',
          borderRadius: 12,
          aspectRatio: '4 / 3',
          border: `1px solid ${theme.border}`,
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {photos.length === 0 ? (
            <div style={{
              fontSize: 'clamp(11px, 0.9vw, 13px)',
              color: 'rgba(255,255,255,0.4)', fontStyle: 'italic',
            }}>
              No photos yet
            </div>
          ) : (
            <img
              key={photos[photoIdx]}
              src={photos[photoIdx]}
              alt=""
              style={{
                width: '100%', height: '100%',
                objectFit: 'contain',
                opacity: photoVisible ? 1 : 0,
                transition: 'opacity 0.6s ease-in-out',
              }}
            />
          )}
        </div>

        {/* Today's Overview - fills remaining space */}
        <div style={{
          background: theme.railBg, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: 'clamp(8px, 1vh, 14px)',
          minHeight: 0, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            fontSize: 'clamp(10px, 0.85vw, 12px)', fontWeight: 700, color: theme.subtext,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 6, flexShrink: 0,
          }}>
            Today
          </div>
          {todayEvents.length === 0 ? (
            <div style={{
              fontSize: 'clamp(11px, 0.9vw, 13px)', color: theme.subtext, fontStyle: 'italic',
            }}>
              Nothing left today
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: 'clamp(4px, 0.6vh, 8px)',
              overflow: 'hidden', minHeight: 0, flex: 1,
            }}>
              {todayEvents.map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'flex-start',
                  gap: 6, fontSize: 'clamp(11px, 0.9vw, 13px)', lineHeight: 1.3,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: eventColor(e),
                    marginTop: 5, flexShrink: 0,
                  }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      color: theme.subtext,
                      fontSize: 'clamp(10px, 0.8vw, 12px)', fontWeight: 600,
                    }}>
                      {formatTime(e.startMinutes)}
                    </div>
                    <div style={{
                      color: theme.text,
                      wordBreak: 'break-word',
                      fontWeight: 500,
                    }}>
                      {e.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR */}
        <div style={{
          background: theme.railBg, border: `1px solid ${theme.border}`,
          borderRadius: 12, padding: 'clamp(8px, 1vh, 14px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 4,
        }}>
          {qrSrc ? (
            <img src={qrSrc} alt="Scan to add"
              style={{
                width: 'clamp(80px, 8vw, 120px)',
                height: 'clamp(80px, 8vw, 120px)',
                background: '#fff', borderRadius: 6,
                imageRendering: 'pixelated',
              }} />
          ) : (
            <div style={{
              width: 'clamp(80px, 8vw, 120px)',
              height: 'clamp(80px, 8vw, 120px)',
              background: theme.muted, borderRadius: 6,
            }} />
          )}
          <div style={{
            fontSize: 'clamp(10px, 0.8vw, 12px)', color: theme.subtext, fontWeight: 500,
          }}>
            scan to add
          </div>
        </div>
      </div>

      {/* FAMILY COLUMNS */}
      <div style={{
        gridArea: 'family',
        display: 'flex',
        gap: 'clamp(4px, 0.6vw, 10px)',
        minHeight: 0,
      }}>
        {columns.map(col => {
          const isEmpty = col.tasks.length === 0 && col.ideas.length === 0
          if (isEmpty) {
            // Minimized vertical strip — just name written sideways
            return (
              <div key={col.member.id} style={{
                flex: '0 0 clamp(36px, 3vw, 48px)',
                background: theme.muted,
                border: `1px solid ${theme.border}`,
                borderRadius: 10, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                opacity: 0.7,
              }}>
                <div style={{ height: 'clamp(4px, 0.5vh, 6px)', background: col.member.color ?? '#888780' }} />
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  writingMode: 'vertical-rl' as any,
                  textOrientation: 'mixed' as any,
                  fontSize: 'clamp(13px, 1vw, 16px)',
                  fontWeight: 600, color: theme.subtext,
                  padding: '8px 0',
                }}>
                  {col.member.display_name}
                </div>
              </div>
            )
          }

          // Active column with tasks/ideas
          return (
            <div key={col.member.id} style={{
              flex: '1 1 0', minWidth: 0,
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 10, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ height: 'clamp(4px, 0.5vh, 6px)', background: col.member.color ?? '#888780' }} />
              <div style={{
                padding: 'clamp(6px, 0.8vh, 10px) clamp(10px, 0.9vw, 14px) 4px',
                fontSize: 'clamp(15px, 1.3vw, 22px)',
                fontWeight: 700, color: theme.text, lineHeight: 1.1,
                flexShrink: 0,
              }}>
                {col.member.display_name}
              </div>
              {/* Scrollable content area with fade mask */}
              <div style={{
                position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden',
                maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              }}>
                <div style={{
                  padding: '0 clamp(10px, 0.9vw, 14px) clamp(8px, 1vh, 12px)',
                  fontSize: 'clamp(11px, 0.95vw, 14px)', lineHeight: 1.4,
                  color: theme.text,
                }}>
                  {col.tasks.map(t => (
                    <div key={t.id} style={{
                      display: 'flex', gap: 6, marginBottom: 4,
                    }}>
                      <span style={{ color: theme.subtext, flexShrink: 0 }}>·</span>
                      <span style={{ wordBreak: 'break-word' }}>{t.text}</span>
                    </div>
                  ))}
                  {col.ideas.length > 0 && (
                    <div style={{
                      marginTop: col.tasks.length > 0 ? 6 : 0,
                      paddingTop: col.tasks.length > 0 ? 6 : 0,
                      borderTop: col.tasks.length > 0 ? `1px dashed ${theme.border}` : 'none',
                      fontSize: 'clamp(10px, 0.8vw, 12px)', color: theme.subtext,
                    }}>
                      {col.ideas.length} idea{col.ideas.length === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
