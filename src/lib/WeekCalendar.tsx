'use client'

import { useEffect, useState, useMemo } from 'react'
import type { DashboardCalendarEvent } from '@/lib/types/calendar'

type Density = 'compact' | 'comfortable'

type Props = {
  events: DashboardCalendarEvent[]
  syncedAt: string
  density?: Density
  // Initial week start ISO date "YYYY-MM-DD" — drives header labels
  weekStart: string
  // If true, polls every 60s for fresh data
  poll?: boolean
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// A small palette for color-cycling events.
// Cycles based on title hash so the same event is the same color each render.
const PALETTE = [
  { bg: '#7F77DD', fg: '#fff' },   // purple
  { bg: '#1D9E75', fg: '#fff' },   // green
  { bg: '#D85A30', fg: '#fff' },   // orange
  { bg: '#1D4ED8', fg: '#fff' },   // blue
  { bg: '#DC2626', fg: '#fff' },   // red
  { bg: '#0891B2', fg: '#fff' },   // cyan
  { bg: '#A16207', fg: '#fff' },   // amber
  { bg: '#65A30D', fg: '#fff' },   // lime
]

function pickColor(title: string): { bg: string; fg: string } {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

// Compute the visible time range — auto-zoom to actual events (with padding)
function computeTimeRange(events: DashboardCalendarEvent[]): { startHour: number; endHour: number } {
  const timed = events.filter(e => !e.allDay)
  if (timed.length === 0) return { startHour: 7, endHour: 21 }

  let minMin = Infinity
  let maxMin = -Infinity
  for (const e of timed) {
    if (e.startMinutes < minMin) minMin = e.startMinutes
    if (e.endMinutes > maxMin) maxMin = e.endMinutes
  }
  // Round down to hour, with 1h padding on each side
  const startHour = Math.max(0, Math.floor(minMin / 60) - 1)
  const endHour   = Math.min(24, Math.ceil(maxMin / 60) + 1)
  // Ensure at least 8 hours visible
  if (endHour - startHour < 8) {
    return { startHour: Math.max(0, Math.min(startHour, 8)), endHour: Math.min(24, startHour + 12) }
  }
  return { startHour, endHour }
}

export default function WeekCalendar({ events: initialEvents, syncedAt: initialSyncedAt,
                                       density = 'comfortable', weekStart, poll = true }: Props) {
  const [events,   setEvents]   = useState(initialEvents)
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt)
  const [now, setNow] = useState(new Date())

  // Tick the now-marker every 60s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Poll for fresh calendar data every 60s if enabled (for always-on displays)
  useEffect(() => {
    if (!poll) return
    const fetchFresh = async () => {
      try {
        const res = await fetch('/api/dashboard/calendar')
        if (!res.ok) return
        const data = await res.json()
        setEvents(data.events ?? [])
        setSyncedAt(data.syncedAt ?? new Date().toISOString())
      } catch { /* swallow — keep showing stale data on failure */ }
    }
    const t = setInterval(fetchFresh, 60_000)
    return () => clearInterval(t)
  }, [poll])

  const { startHour, endHour } = useMemo(() => computeTimeRange(events), [events])
  const hours = endHour - startHour

  const allDayEvents = events.filter(e => e.allDay)
  const timedEvents  = events.filter(e => !e.allDay)

  // Build week dates from weekStart
  const weekDates = useMemo(() => {
    const [y, m, d] = weekStart.split('-').map(Number)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(y, m - 1, d + i)
      return { dayIdx: i, dateNum: date.getDate(), month: date.getMonth() + 1 }
    })
  }, [weekStart])

  // Compute "now" position as minutes-from-startHour (for the red NOW line)
  const todayDayIdx = useMemo(() => {
    const today = new Date()
    const start = new Date(weekStart + 'T00:00:00')
    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000)
    return diffDays >= 0 && diffDays <= 6 ? diffDays : -1
  }, [weekStart, now])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowInRange = nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60

  // Layout constants
  const ROW_HEIGHT = density === 'compact' ? 24 : 36   // per hour
  const HEADER_H   = 50
  const ALL_DAY_H  = allDayEvents.length > 0 ? 30 : 0
  const TIME_COL_W = 44

  return (
    <div style={{
      background: '#fff', border: '1px solid #E2DDD6', borderRadius: 12,
      padding: 12, fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Top bar: week label + sync time */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 8, paddingLeft: TIME_COL_W }}>
        <span style={{ fontSize: 12, color: '#8B8599', fontWeight: 500 }}>
          This week
        </span>
        <span style={{ fontSize: 10, color: '#A8A39B' }}>
          updated {new Date(syncedAt).toLocaleTimeString('en-US',
            { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid',
                    gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)`,
                    borderBottom: '1px solid #E2DDD6' }}>
        <div /> {/* empty corner */}
        {weekDates.map(d => {
          const isToday = d.dayIdx === todayDayIdx
          return (
            <div key={d.dayIdx} style={{
              padding: '8px 4px 6px', textAlign: 'center',
              borderLeft: '1px solid #F0EDE7',
            }}>
              <div style={{ fontSize: 10, color: isToday ? '#C4522A' : '#8B8599',
                            fontWeight: isToday ? 700 : 500,
                            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {DAY_LABELS[d.dayIdx]}
              </div>
              <div style={{ fontSize: isToday ? 18 : 16,
                            fontWeight: isToday ? 700 : 500,
                            color: isToday ? '#C4522A' : '#1A1A2E',
                            lineHeight: 1.1, marginTop: 2 }}>
                {d.dateNum}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day strip */}
      {allDayEvents.length > 0 && (
        <div style={{ display: 'grid',
                      gridTemplateColumns: `${TIME_COL_W}px repeat(7, 1fr)`,
                      borderBottom: '1px solid #E2DDD6',
                      minHeight: ALL_DAY_H, padding: '4px 0',
                      background: '#F7F4EF' }}>
          <div style={{ fontSize: 9, color: '#8B8599',
                        textAlign: 'right', paddingRight: 6, paddingTop: 4 }}>
            all-day
          </div>
          {Array.from({ length: 7 }).map((_, dayIdx) => {
            const dayEvts = allDayEvents.filter(e => e.dayIdx === dayIdx)
            return (
              <div key={dayIdx} style={{ borderLeft: '1px solid #F0EDE7',
                                         padding: '2px 3px',
                                         display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvts.map(e => {
                  const c = e.colorOverride ? { bg: e.colorOverride, fg: '#fff' } : pickColor(e.title)
                  return (
                    <div key={e.id} title={e.title} style={{
                      background: c.bg, color: c.fg, fontSize: 10,
                      padding: '1px 5px', borderRadius: 3,
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
        {/* Time column with hour labels */}
        <div style={{ position: 'relative' }}>
          {Array.from({ length: hours }).map((_, i) => {
            const hour = startHour + i
            const label = hour === 0 ? '12a' : hour < 12 ? `${hour}a`
                          : hour === 12 ? '12p' : `${hour - 12}p`
            return (
              <div key={i} style={{
                position: 'absolute', top: i * ROW_HEIGHT - 6, right: 6,
                fontSize: 9, color: '#A8A39B',
              }}>
                {label}
              </div>
            )
          })}
        </div>

        {/* Day columns */}
        {Array.from({ length: 7 }).map((_, dayIdx) => {
          const dayEvts = timedEvents.filter(e => e.dayIdx === dayIdx)
          return (
            <div key={dayIdx} style={{
              position: 'relative',
              borderLeft: '1px solid #F0EDE7',
              background: dayIdx === todayDayIdx ? '#FFFAF5' : 'transparent',
            }}>
              {/* Hour gridlines */}
              {Array.from({ length: hours }).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', top: i * ROW_HEIGHT, left: 0, right: 0,
                  height: 1, background: '#F4F1EB',
                }} />
              ))}

              {/* Events */}
              {dayEvts.map(e => {
                const c = e.colorOverride ? { bg: e.colorOverride, fg: '#fff' } : pickColor(e.title)
                const top = ((e.startMinutes - startHour * 60) / 60) * ROW_HEIGHT
                const height = Math.max(ROW_HEIGHT * 0.6,
                  ((e.endMinutes - e.startMinutes) / 60) * ROW_HEIGHT)
                return (
                  <div key={e.id} title={`${e.title}${e.location ? ' · ' + e.location : ''}`}
                    style={{
                      position: 'absolute', top, left: 2, right: 2,
                      height, background: c.bg, color: c.fg,
                      borderRadius: 4, padding: '3px 6px',
                      fontSize: 10, lineHeight: 1.25,
                      overflow: 'hidden',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                    }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap',
                                  overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.title}
                    </div>
                    {height > ROW_HEIGHT * 0.9 && e.location && (
                      <div style={{ fontSize: 9, opacity: 0.8, whiteSpace: 'nowrap',
                                    overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.location}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* NOW marker, only on today's column */}
        {todayDayIdx >= 0 && nowInRange && (
          <div style={{
            position: 'absolute',
            top: ((nowMinutes - startHour * 60) / 60) * ROW_HEIGHT,
            left: TIME_COL_W + (todayDayIdx * (100 / 7)) + '%',
            width: `${100 / 7}%`,
            transform: `translateX(-${(todayDayIdx) * 100 / 7}%)`,
            pointerEvents: 'none',
          }}>
            {/* Cleaner: position via a separate calc */}
          </div>
        )}
        {todayDayIdx >= 0 && nowInRange && (
          <NowLine
            dayIdx={todayDayIdx}
            top={((nowMinutes - startHour * 60) / 60) * ROW_HEIGHT}
            timeColWidth={TIME_COL_W}
          />
        )}
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: 'center', color: '#A8A39B', fontSize: 13,
                      padding: '20px 0', fontStyle: 'italic' }}>
          No events this week
        </div>
      )}
    </div>
  )
}

// ─── NOW marker ────────────────────────────────────────────────
function NowLine({ dayIdx, top, timeColWidth }: {
  dayIdx: number; top: number; timeColWidth: number;
}) {
  // Compute pixel-based position by sitting inside the grid layer.
  // Use absolute via percentage of the 7-column area.
  return (
    <div style={{
      position: 'absolute', top, left: timeColWidth, right: 0,
      height: 0, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute',
        top: -1,
        left: `${(dayIdx / 7) * 100}%`,
        width: `${(1 / 7) * 100}%`,
        height: 2,
        background: '#DC2626',
      }} />
      <div style={{
        position: 'absolute',
        top: -4,
        left: `${(dayIdx / 7) * 100}%`,
        width: 8, height: 8, borderRadius: '50%',
        background: '#DC2626',
        marginLeft: -4,
      }} />
    </div>
  )
}
