'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FamilyMember } from '@/lib/types/dashboard'
import type { WeekRange, DashboardCalendarEvent } from '@/lib/types/calendar'

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

export default function KitchenDashboardPortrait({ columns, calendar, members, deviceToken }: Props) {
  const [now, setNow]                 = useState(new Date())
  const [photos, setPhotos]           = useState<string[]>([])
  const [photoIdx, setPhotoIdx]       = useState(0)
  const [photoVisible, setPhotoVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

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

  const isDark = now.getHours() >= 19 || now.getHours() < 7

  const theme = isDark ? {
    bg: '#0F0F1A', card: '#1E1E2E', border: '#2A2A3A',
    text: '#F0EDE7', subtext: '#8B8599',
    railBg: '#1A1A26', muted: '#15151F',
  } : {
    bg: '#F7F4EF', card: '#fff', border: '#E2DDD6',
    text: '#1A1A2E', subtext: '#8B8599',
    railBg: '#fff', muted: '#F7F4EF',
  }

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const todayEvents = useMemo(() => {
    if (!calendar) return []
    const start = new Date(calendar.weekStart + 'T00:00:00')
    const todayIdx = Math.floor(
      (new Date(now.toDateString()).getTime() - start.getTime()) / 86400000
    )
    if (todayIdx < 0 || todayIdx > 6) return []
    const nowMin = now.getHours() * 60 + now.getMinutes()
    return calendar.events
      .filter((e: DashboardCalendarEvent) => e.dayIdx === todayIdx)
      .filter((e: DashboardCalendarEvent) => e.allDay || e.endMinutes > nowMin - 30)
      .sort((a, b) => {
        if (a.allDay && !b.allDay) return -1
        if (!a.allDay && b.allDay) return 1
        return a.startMinutes - b.startMinutes
      })
      .slice(0, 8)
  }, [calendar, now])

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

  // Pad columns to 8 with empty slots so the grid stays consistent
  const paddedColumns = useMemo(() => {
    const arr = [...columns]
    while (arr.length < 8) {
      arr.push({
        member: { id: `__empty__${arr.length}`, display_name: '', color: null } as any,
        tasks: [], ideas: [],
      })
    }
    return arr.slice(0, 8)
  }, [columns])

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: theme.bg, color: theme.text,
      fontFamily: "'DM Sans', sans-serif",
      display: 'grid',
      gridTemplateRows: 'auto auto auto 1fr auto',
      gridTemplateAreas: `
        "clock"
        "today"
        "photo"
        "family"
        "qr"
      `,
      gap: 'clamp(8px, 1vh, 14px)',
      padding: 'clamp(10px, 1.2vh, 18px)',
      overflow: 'hidden',
      transition: 'background 0.5s, color 0.5s',
    }}>
      {/* CLOCK */}
      <div style={{
        gridArea: 'clock',
        background: theme.railBg, border: `1px solid ${theme.border}`,
        borderRadius: 14, padding: 'clamp(12px, 1.5vh, 22px)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 'clamp(14px, 1.6vw, 20px)',
          fontWeight: 600, color: theme.subtext,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {dayName}
        </div>
        <div style={{
          fontSize: 'clamp(56px, 9vw, 110px)', fontWeight: 700,
          lineHeight: 1.0, margin: '4px 0',
          fontFamily: "'Playfair Display', serif",
          color: theme.text, letterSpacing: '-0.02em',
        }}>
          {timeStr}
        </div>
        <div style={{
          fontSize: 'clamp(14px, 1.4vw, 20px)',
          color: theme.subtext, fontWeight: 500,
        }}>
          {dateStr}
        </div>
      </div>

      {/* TODAY (hero) */}
      <div style={{
        gridArea: 'today',
        background: theme.railBg, border: `1px solid ${theme.border}`,
        borderRadius: 14, padding: 'clamp(12px, 1.5vh, 20px)',
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 700,
          color: theme.subtext, textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 8,
        }}>
          Today
        </div>
        {todayEvents.length === 0 ? (
          <div style={{
            fontSize: 'clamp(14px, 1.4vw, 18px)',
            color: theme.subtext, fontStyle: 'italic',
            padding: '8px 0',
          }}>
            Nothing left today
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 0.8vh, 10px)' }}>
            {todayEvents.map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center',
                gap: 'clamp(8px, 1vw, 14px)',
                padding: 'clamp(6px, 0.8vh, 10px)',
                background: theme.muted,
                borderRadius: 8,
                borderLeft: `4px solid ${eventColor(e)}`,
              }}>
                <div style={{
                  fontSize: 'clamp(13px, 1.4vw, 18px)',
                  fontWeight: 600, color: theme.text,
                  minWidth: 'clamp(60px, 7vw, 100px)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {e.allDay ? 'all day' : formatTime(e.startMinutes)}
                </div>
                <div style={{
                  fontSize: 'clamp(13px, 1.4vw, 18px)',
                  color: theme.text, flex: 1, minWidth: 0,
                  wordBreak: 'break-word',
                }}>
                  {e.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PHOTO */}
      <div style={{
        gridArea: 'photo',
        background: isDark ? '#000' : '#1A1A2E',
        borderRadius: 14, border: `1px solid ${theme.border}`,
        position: 'relative', overflow: 'hidden',
        aspectRatio: '16 / 10',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {photos.length === 0 ? (
          <div style={{
            fontSize: 'clamp(13px, 1.2vw, 16px)',
            color: 'rgba(255,255,255,0.4)', fontStyle: 'italic',
          }}>
            No photos yet — upload at /admin/photos
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

      {/* FAMILY 2x4 grid - takes remaining space */}
      <div style={{
        gridArea: 'family',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: 'clamp(6px, 0.8vh, 10px)',
        minHeight: 0,
      }}>
        {paddedColumns.map((col, idx) => {
          const isPlaceholder = col.member.id.startsWith('__empty__')
          const isEmpty = !isPlaceholder && col.tasks.length === 0 && col.ideas.length === 0

          if (isPlaceholder) {
            return <div key={`placeholder-${idx}`} style={{
              background: theme.muted, border: `1px dashed ${theme.border}`,
              borderRadius: 10, opacity: 0.3,
            }} />
          }

          return (
            <div key={col.member.id} style={{
              background: isEmpty ? theme.muted : theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              overflow: 'hidden', minHeight: 0,
              display: 'flex', flexDirection: 'column',
              opacity: isEmpty ? 0.7 : 1,
            }}>
              <div style={{
                height: 'clamp(4px, 0.4vh, 6px)',
                background: col.member.color ?? '#888780',
                flexShrink: 0,
              }} />
              <div style={{
                padding: 'clamp(6px, 0.8vh, 10px) clamp(8px, 1vw, 14px) 4px',
                fontSize: 'clamp(13px, 1.3vw, 18px)',
                fontWeight: 700, color: theme.text, lineHeight: 1.1,
                flexShrink: 0,
              }}>
                {col.member.display_name}
              </div>
              {isEmpty ? (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(10px, 1vw, 13px)', color: theme.subtext,
                  fontStyle: 'italic',
                }}>
                  —
                </div>
              ) : (
                <div style={{
                  position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden',
                  maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                }}>
                  <div style={{
                    padding: '0 clamp(8px, 1vw, 14px) clamp(8px, 1vh, 12px)',
                    fontSize: 'clamp(11px, 1vw, 14px)', lineHeight: 1.4,
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
                        fontSize: 'clamp(10px, 0.9vw, 12px)', color: theme.subtext,
                      }}>
                        {col.ideas.length} idea{col.ideas.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* QR row */}
      <div style={{
        gridArea: 'qr',
        background: theme.railBg, border: `1px solid ${theme.border}`,
        borderRadius: 12, padding: 'clamp(8px, 1vh, 14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14,
      }}>
        {qrSrc ? (
          <>
            <img src={qrSrc} alt="Scan to add"
              style={{
                width: 'clamp(70px, 8vw, 110px)',
                height: 'clamp(70px, 8vw, 110px)',
                background: '#fff', borderRadius: 6,
                imageRendering: 'pixelated',
              }} />
            <div style={{
              fontSize: 'clamp(13px, 1.3vw, 17px)', color: theme.text, fontWeight: 500,
            }}>
              Scan to add a task or idea
            </div>
          </>
        ) : (
          <div style={{ fontSize: 'clamp(11px, 1vw, 14px)', color: theme.subtext }}>
            No device token
          </div>
        )}
      </div>
    </div>
  )
}
