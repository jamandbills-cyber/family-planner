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
  const [viewportPortrait, setViewportPortrait] = useState(true)

  // Detect whether the actual viewport is portrait or landscape.
  // If a user previews this on a desktop browser (landscape window),
  // we'll center the portrait UI in a 9:16 frame so it doesn't stretch.
  useEffect(() => {
    const check = () => setViewportPortrait(window.innerHeight > window.innerWidth)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  // Inner content uses 1fr for the photo and family rows so they share remaining space.
  // Critically, the photo NO LONGER has aspectRatio — it just fills what it's given.
  const inner = (
    <div style={{
      width: '100%', height: '100%',
      background: theme.bg, color: theme.text,
      fontFamily: "'DM Sans', sans-serif",
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr 2fr auto',
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
      minHeight: 0,
    }}>
      {/* CLOCK */}
      <div style={{
        gridArea: 'clock',
        background: theme.railBg, border: `1px solid ${theme.border}`,
        borderRadius: 14, padding: 'clamp(10px, 1.2vh, 18px)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 'clamp(12px, 1.4vh, 18px)',
          fontWeight: 600, color: theme.subtext,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {dayName}
        </div>
        <div style={{
          fontSize: 'clamp(40px, 7vh, 90px)', fontWeight: 700,
          lineHeight: 1.0, margin: '4px 0',
          fontFamily: "'Playfair Display', serif",
          color: theme.text, letterSpacing: '-0.02em',
        }}>
          {timeStr}
        </div>
        <div style={{
          fontSize: 'clamp(12px, 1.3vh, 18px)',
          color: theme.subtext, fontWeight: 500,
        }}>
          {dateStr}
        </div>
      </div>

      {/* TODAY (hero) */}
      <div style={{
        gridArea: 'today',
        background: theme.railBg, border: `1px solid ${theme.border}`,
        borderRadius: 14, padding: 'clamp(10px, 1.2vh, 16px)',
        minHeight: 0, overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 'clamp(10px, 1vh, 13px)', fontWeight: 700,
          color: theme.subtext, textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 8,
        }}>
          Today
        </div>
        {todayEvents.length === 0 ? (
          <div style={{
            fontSize: 'clamp(13px, 1.4vh, 17px)',
            color: theme.subtext, fontStyle: 'italic',
            padding: '4px 0',
          }}>
            Nothing left today
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(5px, 0.7vh, 9px)' }}>
            {todayEvents.map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center',
                gap: 'clamp(8px, 1vw, 14px)',
                padding: 'clamp(5px, 0.7vh, 9px) clamp(8px, 1vw, 12px)',
                background: theme.muted,
                borderRadius: 8,
                borderLeft: `4px solid ${eventColor(e)}`,
              }}>
                <div style={{
                  fontSize: 'clamp(12px, 1.4vh, 17px)',
                  fontWeight: 600, color: theme.text,
                  minWidth: 'clamp(54px, 6vw, 88px)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {e.allDay ? 'all day' : formatTime(e.startMinutes)}
                </div>
                <div style={{
                  fontSize: 'clamp(12px, 1.4vh, 17px)',
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

      {/* PHOTO — fills its grid cell, no aspectRatio */}
      <div style={{
        gridArea: 'photo',
        background: photos.length === 0 ? theme.muted : (isDark ? '#000' : '#1A1A2E'),
        borderRadius: 14, border: `1px solid ${theme.border}`,
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 0,
      }}>
        {photos.length === 0 ? (
          <div style={{
            fontSize: 'clamp(11px, 1.2vh, 14px)',
            color: theme.subtext, fontStyle: 'italic',
            textAlign: 'center', padding: 14,
          }}>
            No photos yet — upload at /admin/photos
          </div>
        ) : (
          <img
            key={photos[photoIdx]}
            src={photos[photoIdx]}
            alt=""
            style={{
              maxWidth: '100%', maxHeight: '100%',
              objectFit: 'contain',
              opacity: photoVisible ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
            }}
          />
        )}
      </div>

      {/* FAMILY 2x4 grid */}
      <div style={{
        gridArea: 'family',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: 'clamp(6px, 0.8vh, 10px)',
        minHeight: 0, overflow: 'hidden',
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
                padding: 'clamp(5px, 0.7vh, 9px) clamp(8px, 1vw, 12px) 4px',
                fontSize: 'clamp(13px, 1.5vh, 18px)',
                fontWeight: 700, color: theme.text, lineHeight: 1.1,
                flexShrink: 0,
              }}>
                {col.member.display_name}
              </div>
              {isEmpty ? (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(10px, 1.1vh, 13px)', color: theme.subtext,
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
                    padding: '0 clamp(8px, 1vw, 12px) clamp(6px, 0.8vh, 10px)',
                    fontSize: 'clamp(11px, 1.2vh, 14px)', lineHeight: 1.4,
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
                        fontSize: 'clamp(10px, 1vh, 12px)', color: theme.subtext,
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
        borderRadius: 12, padding: 'clamp(8px, 1vh, 12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14,
      }}>
        {qrSrc ? (
          <>
            <img src={qrSrc} alt="Scan to add"
              style={{
                width: 'clamp(60px, 9vh, 100px)',
                height: 'clamp(60px, 9vh, 100px)',
                background: '#fff', borderRadius: 6,
                imageRendering: 'pixelated',
              }} />
            <div style={{
              fontSize: 'clamp(13px, 1.5vh, 17px)', color: theme.text, fontWeight: 500,
            }}>
              Scan to add a task or idea
            </div>
          </>
        ) : (
          <div style={{ fontSize: 'clamp(11px, 1.1vh, 14px)', color: theme.subtext }}>
            No device token
          </div>
        )}
      </div>
    </div>
  )

  // If the viewport is actually portrait (Fire TV rotated, phone, etc),
  // render edge-to-edge. If the viewport is landscape (desktop preview),
  // center a 9:16 framed version against a backdrop so it looks like a phone.
  if (viewportPortrait) {
    return <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>{inner}</div>
  }

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: '#0A0A12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        aspectRatio: '9 / 16',
        maxWidth: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {inner}
      </div>
    </div>
  )
}
