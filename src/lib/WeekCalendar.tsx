'use client'

import { useEffect, useState, useMemo } from 'react'
import type { DashboardCalendarEvent } from '@/lib/types/calendar'

type Density = 'compact' | 'comfortable' | 'tv'

type FamilyMemberColor = { id: string; display_name: string; color: string | null }

type Props = {
  events: DashboardCalendarEvent[]
  syncedAt: string
  weekStart: string
  density?: Density
  poll?: boolean
  members?: FamilyMemberColor[]
  darkMode?: boolean
}

const DAY_LABELS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const NEUTRAL_LIGHT = '#888780'
const NEUTRAL_DARK  = '#3A3A4A'
const SCHOOL_BG_LIGHT = '#FEF9C3'
const SCHOOL_BG_DARK  = '#3A3614'
const SCHOOL_FG_LIGHT = '#713F12'
const SCHOOL_FG_DARK  = '#FEF3C7'

function pickEventColor(event: DashboardCalendarEvent,
                        members: FamilyMemberColor[],
                        isDark: boolean): { bg: string; fg: string } {
  if (event.colorOverride) return { bg: event.colorOverride, fg: '#fff' }
  if (event.isSchoolEvent) {
    return { bg: isDark ? SCHOOL_BG_DARK : SCHOOL_BG_LIGHT,
             fg: isDark ? SCHOOL_FG_DARK : SCHOOL_FG_LIGHT }
  }
  // Color by first involved member if any
  if (event.involvedIds && event.involvedIds.length > 0) {
    const first = members.find(m => event.involvedIds!.includes(m.id) && m.color)
    if (first?.color) return { bg: first.color, fg: '#fff' }
  }
  // Fallback: name match against title
  const titleLower = event.title.toLowerCase()
  for (const m of members) {
    if (!m.color) continue
    const re = new RegExp(`\\b${m.display_name.toLowerCase()}\\b`, 'i')
    if (re.test(titleLower)) return { bg: m.color, fg: '#fff' }
  }
  return { bg: isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT, fg: '#fff' }
}

function computeTimeRange(events: DashboardCalendarEvent[]): { startHour: number; endHour: number } {
  const timed = events.filter(e => !e.allDay)
  if (timed.length === 0) return { startHour: 7, endHour: 21 }
  let minMin = Infinity, maxMin = -Infinity
  for (const e of timed) {
    if (e.startMinutes < minMin) minMin = e.startMinutes
    if (e.endMinutes > maxMin) maxMin = e.endMinutes
  }
  const startHour = Math.max(0, Math.floor(minMin / 60) - 1)
  const endHour   = Math.min(24, Math.ceil(maxMin / 60) + 1)
  if (endHour - startHour < 8) {
    return { startHour: Math.max(0, Math.min(startHour, 8)), endHour: Math.min(24, startHour + 12) }
  }
  return { startHour, endHour }
}

function densityScale(density: Density) {
  if (density === 'tv')         return { hourPx: 56, hourLabelSize: 16, dayLabelSize: 14, dayNumSize: 36, eventTitleSize: 17, eventLocSize: 13, allDayBlockSize: 14, headerH: 76, allDayMin: 44, leftColW: 64, chipSize: 22, chipFontSize: 11, chipGap: 4 }
  if (density === 'comfortable') return { hourPx: 36, hourLabelSize: 11, dayLabelSize: 11, dayNumSize: 18, eventTitleSize: 11, eventLocSize: 10, allDayBlockSize: 11, headerH: 50, allDayMin: 30, leftColW: 48, chipSize: 16, chipFontSize: 9, chipGap: 2 }
  return { hourPx: 26, hourLabelSize: 10, dayLabelSize: 10, dayNumSize: 14, eventTitleSize: 10, eventLocSize: 9, allDayBlockSize: 10, headerH: 40, allDayMin: 24, leftColW: 40, chipSize: 14, chipFontSize: 8, chipGap: 2 }
}

// Render colored initial chips for involved family members
function ChipRow({ involvedIds, members, chipSize, chipFontSize, chipGap }: {
  involvedIds: string[]; members: FamilyMemberColor[];
  chipSize: number; chipFontSize: number; chipGap: number;
}) {
  if (!involvedIds || involvedIds.length === 0) return null
  const involved = involvedIds
    .map(id => members.find(m => m.id === id))
    .filter((m): m is FamilyMemberColor => !!m)
  if (involved.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: chipGap, marginTop: chipGap, flexWrap: 'wrap' }}>
      {involved.map(m => (
        <div key={m.id} title={m.display_name} style={{
          width: chipSize, height: chipSize, borderRadius: '50%',
          background: m.color ?? '#888780', color: '#fff',
          fontSize: chipFontSize, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid rgba(255,255,255,0.4)',
          flexShrink: 0,
        }}>
          {m.display_name[0].toUpperCase()}
        </div>
      ))}
    </div>
  )
}

export default function WeekCalendar({
  events: initialEvents, syncedAt: initialSyncedAt, weekStart,
  density = 'comfortable', poll = true, members = [], darkMode,
}: Props) {
  const [events,   setEvents]   = useState(initialEvents)
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!poll) return
    const fetchFresh = async () => {
      try {
        const res = await fetch('/api/dashboard/calendar')
        if (!res.ok) return
        const data = await res.json()
        setEvents(data.events ?? [])
        setSyncedAt(data.syncedAt ?? new Date().toISOString())
      } catch {}
    }
    const t = setInterval(fetchFresh, 60_000)
    return () => clearInterval(t)
  }, [poll])

  const isDark = darkMode !== undefined ? darkMode : (now.getHours() >= 19 || now.getHours() < 7)

  const theme = isDark ? {
    bg: '#15151F', card: '#1E1E2E', border: '#2A2A3A',
    text: '#F0EDE7', subtext: '#8B8599',
    todayBg: '#22222F', todayAccent: '#FFB088',
    gridline: '#2A2A3A', nowLine: '#F87171',
  } : {
    bg: '#fff', card: '#fff', border: '#E2DDD6',
    text: '#1A1A2E', subtext: '#8B8599',
    todayBg: '#FFFAF5', todayAccent: '#C4522A',
    gridline: '#F4F1EB', nowLine: '#DC2626',
  }

  const { startHour, endHour } = useMemo(() => computeTimeRange(events), [events])
  const hours = endHour - startHour
  const allDayEvents = events.filter(e => e.allDay)
  const timedEvents  = events.filter(e => !e.allDay)

  const weekDates = useMemo(() => {
    const [y, m, d] = weekStart.split('-').map(Number)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(y, m - 1, d + i)
      return { dayIdx: i, dateNum: date.getDate() }
    })
  }, [weekStart])

  const todayDayIdx = useMemo(() => {
    const today = new Date()
    const start = new Date(weekStart + 'T00:00:00')
    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000)
    return diffDays >= 0 && diffDays <= 6 ? diffDays : -1
  }, [weekStart, now])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowInRange = nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60

  const s = densityScale(density)
  const ROW_HEIGHT = s.hourPx
  const TIME_COL_W = s.leftColW
  const ALL_DAY_H  = allDayEvents.length > 0 ? s.allDayMin : 0
  const dayLabelLong = density === 'tv'

  const memberById = useMemo(() => {
    const m = new Map<string, FamilyMemberColor>()
    members.forEach(mem => m.set(mem.id, mem))
    return m
  }, [members])

  const driverNameOf = (driverId: string | null | undefined) =>
    driverId ? (memberById.get(driverId)?.display_name ?? null) : null

  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
      padding: density === 'tv' ? 16 : 12,
      fontFamily: "'DM Sans', sans-serif", color: theme.text,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transition: 'background 0.5s, color 0.5s, border-color 0.5s',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: density === 'tv' ? 12 : 8, paddingLeft: TIME_COL_W,
      }}>
        <span style={{ fontSize: density === 'tv' ? 16 : 12, color: theme.subtext, fontWeight: 500 }}>
          This week
        </span>
        <span style={{ fontSize: density === 'tv' ? 12 : 10, color: theme.subtext }}>
          updated {new Date(syncedAt).toLocaleTimeString('en-US',
            { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid',
                    gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)`,
                    borderBottom: `1px solid ${theme.border}` }}>
        <div />
        {weekDates.map(d => {
          const isToday = d.dayIdx === todayDayIdx
          return (
            <div key={d.dayIdx} style={{
              padding: density === 'tv' ? '10px 6px' : '8px 4px 6px',
              textAlign: 'center', borderLeft: `1px solid ${theme.gridline}`,
            }}>
              <div style={{
                fontSize: s.dayLabelSize,
                color: isToday ? theme.todayAccent : theme.subtext,
                fontWeight: isToday ? 700 : 500,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {dayLabelLong ? DAY_LABELS_FULL[d.dayIdx] : DAY_LABELS_SHORT[d.dayIdx]}
              </div>
              <div style={{
                fontSize: isToday ? s.dayNumSize + 4 : s.dayNumSize,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? theme.todayAccent : theme.text,
                lineHeight: 1.05, marginTop: 2,
              }}>
                {d.dateNum}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day strip */}
      {allDayEvents.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)`,
          borderBottom: `1px solid ${theme.border}`,
          minHeight: ALL_DAY_H, padding: '4px 0',
          background: isDark ? '#1A1A26' : '#F7F4EF',
        }}>
          <div style={{ fontSize: density === 'tv' ? 12 : 9, color: theme.subtext,
                        textAlign: 'right', paddingRight: 6, paddingTop: 4 }}>
            all-day
          </div>
          {Array.from({ length: 7 }).map((_, dayIdx) => {
            const dayEvts = allDayEvents.filter(e => e.dayIdx === dayIdx)
            return (
              <div key={dayIdx} style={{
                borderLeft: `1px solid ${theme.gridline}`,
                padding: '3px 4px',
                display: 'flex', flexDirection: 'column', gap: 3,
              }}>
                {dayEvts.map(e => {
                  const c = pickEventColor(e, members, isDark)
                  return (
                    <div key={e.id} title={e.title} style={{
                      background: c.bg, color: c.fg,
                      fontSize: s.allDayBlockSize, fontWeight: 500,
                      padding: density === 'tv' ? '4px 10px' : '1px 6px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      lineHeight: 1.4,
                    }}>
                      {e.title}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Time grid */}
      <div style={{ position: 'relative', display: 'grid',
                    gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)`,
                    height: hours * ROW_HEIGHT }}>
        <div style={{ position: 'relative' }}>
          {Array.from({ length: hours }).map((_, i) => {
            const hour = startHour + i
            const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM`
                          : hour === 12 ? '12 PM' : `${hour - 12} PM`
            return (
              <div key={i} style={{
                position: 'absolute', top: i * ROW_HEIGHT - (s.hourLabelSize / 2),
                right: 8, fontSize: s.hourLabelSize, color: theme.subtext,
                fontWeight: 500,
              }}>{label}</div>
            )
          })}
        </div>

        {Array.from({ length: 7 }).map((_, dayIdx) => {
          const dayEvts = timedEvents.filter(e => e.dayIdx === dayIdx)
          return (
            <div key={dayIdx} style={{
              position: 'relative',
              borderLeft: `1px solid ${theme.gridline}`,
              background: dayIdx === todayDayIdx ? theme.todayBg : 'transparent',
            }}>
              {Array.from({ length: hours }).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', top: i * ROW_HEIGHT, left: 0, right: 0,
                  height: 1, background: theme.gridline,
                }} />
              ))}

              {dayEvts.map(e => {
                const c = pickEventColor(e, members, isDark)
                const top = ((e.startMinutes - startHour * 60) / 60) * ROW_HEIGHT
                const height = Math.max(ROW_HEIGHT * 0.7,
                  ((e.endMinutes - e.startMinutes) / 60) * ROW_HEIGHT)
                const driverName = driverNameOf(e.driverId)
                const needsDriver = e.transportStatus === 'needs_driver' && !e.driverId
                const showChips = (e.involvedIds && e.involvedIds.length > 0) && height > ROW_HEIGHT * 0.85

                return (
                  <div key={e.id}
                    title={`${e.title}${e.location ? ' · ' + e.location : ''}${driverName ? ' · driver: ' + driverName : ''}`}
                    style={{
                      position: 'absolute', top, left: 3, right: 3,
                      height, background: c.bg, color: c.fg,
                      borderRadius: 5,
                      padding: density === 'tv' ? '6px 10px' : '3px 6px',
                      fontSize: s.eventTitleSize, lineHeight: 1.25,
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                      borderLeft: needsDriver ? `4px solid ${theme.nowLine}` : undefined,
                    }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap',
                                  overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.title}
                    </div>
                    {height > ROW_HEIGHT * 1.1 && driverName && (
                      <div style={{ fontSize: s.eventLocSize, opacity: 0.95,
                                    fontWeight: 500, marginTop: 2 }}>
                        🚗 {driverName}
                      </div>
                    )}
                    {height > ROW_HEIGHT * 1.1 && needsDriver && (
                      <div style={{ fontSize: s.eventLocSize, opacity: 0.95,
                                    fontWeight: 500, marginTop: 2 }}>
                        ⚠ needs driver
                      </div>
                    )}
                    {showChips && (
                      <ChipRow
                        involvedIds={e.involvedIds!}
                        members={members}
                        chipSize={s.chipSize}
                        chipFontSize={s.chipFontSize}
                        chipGap={s.chipGap} />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {todayDayIdx >= 0 && nowInRange && (
          <NowLine
            dayIdx={todayDayIdx}
            top={((nowMinutes - startHour * 60) / 60) * ROW_HEIGHT}
            timeColWidth={TIME_COL_W}
            color={theme.nowLine}
          />
        )}
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: 'center', color: theme.subtext,
                      fontSize: density === 'tv' ? 18 : 13,
                      padding: '30px 0', fontStyle: 'italic' }}>
          No events this week
        </div>
      )}
    </div>
  )
}

function NowLine({ dayIdx, top, timeColWidth, color }: {
  dayIdx: number; top: number; timeColWidth: number; color: string;
}) {
  return (
    <div style={{
      position: 'absolute', top, left: timeColWidth, right: 0,
      height: 0, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', top: -1.5,
        left: `${(dayIdx / 7) * 100}%`,
        width: `${(1 / 7) * 100}%`,
        height: 3, background: color,
      }} />
      <div style={{
        position: 'absolute', top: -6,
        left: `${(dayIdx / 7) * 100}%`,
        width: 12, height: 12, borderRadius: '50%',
        background: color, marginLeft: -6,
      }} />
    </div>
  )
}
