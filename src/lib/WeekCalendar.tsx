'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DashboardCalendarEvent } from '@/lib/types/calendar'

type Density = 'compact' | 'comfortable' | 'tv'
type FamilyMemberColor = { id: string; display_name: string; color: string | null }

export type DinnerSlot = { dayIdx: number; meal: string; cook: string }

type Props = {
  events: DashboardCalendarEvent[]
  syncedAt: string
  weekStart: string
  density?: Density
  poll?: boolean
  members?: FamilyMemberColor[]
  darkMode?: boolean
  fillHeight?: boolean
  dinner?: DinnerSlot[]
}

const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const NEUTRAL_LIGHT = '#888780'
const NEUTRAL_DARK  = '#3A3A4A'
const SCHOOL_BG_LIGHT = '#FEF3C7'
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
  if (event.involvedIds && event.involvedIds.length > 0) {
    const first = members.find(m => event.involvedIds!.includes(m.id) && m.color)
    if (first?.color) return { bg: first.color, fg: '#fff' }
  }
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
  if (timed.length === 0) return { startHour: 8, endHour: 18 }
  let minMin = Infinity, maxMin = -Infinity
  for (const e of timed) {
    if (e.startMinutes < minMin) minMin = e.startMinutes
    if (e.endMinutes > maxMin) maxMin = e.endMinutes
  }
  const startHour = Math.max(0, Math.floor(minMin / 60))
  const endHour   = Math.min(24, Math.ceil(maxMin / 60))
  if (endHour <= startHour) return { startHour, endHour: startHour + 1 }
  return { startHour, endHour }
}

function densityScale(density: Density) {
  if (density === 'tv') return {
    hourLabelSize: 'clamp(11px, 0.85vw, 14px)',
    dayLabelSize:  'clamp(10px, 0.75vw, 12px)',
    dayNumSize:    'clamp(13px, 1.05vw, 17px)',
    eventLocSize:  'clamp(10px, 0.8vw, 12px)',
    allDayBlockSize:'clamp(11px, 0.85vw, 13px)',
    leftColW:      'clamp(40px, 3.5vw, 56px)',
    chipSize:      'clamp(12px, 0.95vw, 15px)',
    chipFontSize:  'clamp(7px, 0.55vw, 9px)',
    chipGap:       2,
    minPxPerHour:  40,
    dinnerMealSize: 'clamp(11px, 0.85vw, 13px)',
    dinnerCookSize: 'clamp(9px, 0.7vw, 11px)',
  }
  if (density === 'comfortable') return {
    hourLabelSize: '11px', dayLabelSize: '11px', dayNumSize: '14px',
    eventLocSize: '10px', allDayBlockSize: '11px',
    leftColW: '48px', chipSize: 18, chipFontSize: 10, chipGap: 3,
    minPxPerHour: 56,
    dinnerMealSize: '11px', dinnerCookSize: '10px',
  }
  return {
    hourLabelSize: '10px', dayLabelSize: '10px', dayNumSize: '12px',
    eventLocSize: '9px', allDayBlockSize: '10px',
    leftColW: '40px', chipSize: 14, chipFontSize: 8, chipGap: 2,
    minPxPerHour: 40,
    dinnerMealSize: '10px', dinnerCookSize: '9px',
  }
}

function eventBlockStyle(heightPct: number) {
  if (heightPct >= 12) return {
    titleSize: 'clamp(13px, 1.05vw, 17px)',
    locSize:   'clamp(11px, 0.85vw, 13px)',
    pad:       '6px 10px',
    lineHeight: 1.2,
    showLocation: true,
    showChips: true,
    showCarpoolNote: true,
  }
  if (heightPct >= 6) return {
    titleSize: 'clamp(12px, 0.95vw, 15px)',
    locSize:   'clamp(10px, 0.8vw, 12px)',
    pad:       '4px 8px',
    lineHeight: 1.2,
    showLocation: true,
    showChips: true,
    showCarpoolNote: true,
  }
  if (heightPct >= 3.5) return {
    titleSize: 'clamp(10px, 0.78vw, 12px)',
    locSize:   'clamp(9px, 0.7vw, 11px)',
    pad:       '2px 5px',
    lineHeight: 1.1,
    showLocation: false,
    showChips: true,
    showCarpoolNote: true,
  }
  if (heightPct >= 2) return {
    titleSize: 'clamp(9px, 0.7vw, 11px)',
    locSize:   'clamp(8px, 0.65vw, 10px)',
    pad:       '1px 4px',
    lineHeight: 1.05,
    showLocation: false,
    showChips: false,
    showCarpoolNote: false,
  }
  return {
    titleSize: 'clamp(8px, 0.65vw, 10px)',
    locSize:   'clamp(8px, 0.65vw, 10px)',
    pad:       '1px 3px',
    lineHeight: 1.05,
    showLocation: false,
    showChips: false,
    showCarpoolNote: false,
  }
}

function ChipRow({ involvedIds, members, chipSize, chipFontSize, chipGap }: {
  involvedIds: string[]; members: FamilyMemberColor[];
  chipSize: number | string; chipFontSize: number | string; chipGap: number;
}) {
  if (!involvedIds || involvedIds.length === 0) return null
  const involved = involvedIds
    .map(id => members.find(m => m.id === id))
    .filter((m): m is FamilyMemberColor => !!m)
  if (involved.length === 0) return null
  const visible = involved.slice(0, 4)
  const hiddenCount = involved.length - visible.length
  return (
    <div style={{ display: 'flex', gap: chipGap, marginTop: 2, flexWrap: 'nowrap', overflow: 'hidden' }}>
      {visible.map(m => (
        <div key={m.id} title={m.display_name} style={{
          width: chipSize as any, height: chipSize as any, borderRadius: '50%',
          background: m.color ?? '#888780', color: '#fff',
          fontSize: chipFontSize as any, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid rgba(255,255,255,0.4)', flexShrink: 0,
        }}>
          {m.display_name[0].toUpperCase()}
        </div>
      ))}
      {hiddenCount > 0 && (
        <div title={`${hiddenCount} more`} style={{
          minWidth: chipSize as any, height: chipSize as any, borderRadius: 999,
          background: 'rgba(0,0,0,0.28)', color: '#fff',
          fontSize: chipFontSize as any, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px', flexShrink: 0,
        }}>
          +{hiddenCount}
        </div>
      )}
    </div>
  )
}

function displayTitle(e: DashboardCalendarEvent): string {
  if (!e.isSchoolEvent) return e.title
  let t = e.title.replace(/\s*\([^)]*\)\s*/g, '').trim()
  t = t.replace(/^School\s+/i, '')
  return t || e.title
}

export default function WeekCalendar({
  events: initialEvents, syncedAt: initialSyncedAt, weekStart,
  density = 'comfortable', poll = true, members = [], darkMode,
  fillHeight = false, dinner = [],
}: Props) {
  const [events,   setEvents]   = useState(initialEvents)
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt)
  const [now, setNow] = useState(new Date())

  // Re-sync state when props change (parent passing fresh data via polling)
  useEffect(() => { setEvents(initialEvents) }, [initialEvents])
  useEffect(() => { setSyncedAt(initialSyncedAt) }, [initialSyncedAt])

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
    card: '#1E1E2E', border: '#2A2A3A', text: '#F0EDE7', subtext: '#8B8599',
    todayBg: '#262638', todayHeaderBg: '#332A2D', todayAccent: '#FFB088',
    gridline: '#2A2A3A', nowLine: '#F87171',
    activeRing: '#F87171',
    dinnerBg: '#15151F', dinnerLabel: '#FFB088',
  } : {
    card: '#fff', border: '#E2DDD6', text: '#1A1A2E', subtext: '#8B8599',
    todayBg: '#FFF4EA', todayHeaderBg: '#FFE7DA', todayAccent: '#C4522A',
    gridline: '#F4F1EB', nowLine: '#DC2626',
    activeRing: '#DC2626',
    dinnerBg: '#FAF6EE', dinnerLabel: '#C4522A',
  }

  const { startHour, endHour } = useMemo(() => computeTimeRange(events), [events])
  const totalMin = (endHour - startHour) * 60
  const allDayEvents = events.filter(e => e.allDay)
  const timedEvents  = events.filter(e => !e.allDay)

  const weekDates = useMemo(() => {
    const [y, m, d] = weekStart.split('-').map(Number)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(y, m - 1, d + i)
      return {
        dayIdx: i,
        dateNum: date.getDate(),
        label: i === 0 ? 'Today' : DAY_LABELS_SHORT[date.getDay()],
      }
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

  const memberById = useMemo(() => {
    const m = new Map<string, FamilyMemberColor>()
    members.forEach(mem => m.set(mem.id, mem))
    return m
  }, [members])

  const driverNameOf = (driverId: string | null | undefined) =>
    driverId ? (memberById.get(driverId)?.display_name ?? null) : null

  const cookColorOf = (cookName: string): string | null => {
    if (!cookName) return null
    const lower = cookName.toLowerCase().trim()
    const m = members.find(mem => mem.display_name.toLowerCase() === lower)
    return m?.color ?? null
  }

  const pctTop = (startMin: number) => ((startMin - startHour * 60) / totalMin) * 100
  const pctHeight = (startMin: number, endMin: number) => ((endMin - startMin) / totalMin) * 100

  const minGridHeight = (endHour - startHour) * s.minPxPerHour

  const dinnerByDay = useMemo(() => {
    const map = new Map<number, DinnerSlot>()
    for (const d of dinner) {
      if (typeof d.dayIdx === 'number') map.set(d.dayIdx, d)
    }
    return map
  }, [dinner])

  const hasAnyDinner = dinner.some(d => (d.meal && d.meal.trim()) || (d.cook && d.cook.trim()))

  return (
    <div style={{
      width: '100%',
      height: fillHeight ? '100%' : 'auto',
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
      padding: density === 'tv' ? 'clamp(8px, 1vh, 14px)' : 12,
      fontFamily: "'DM Sans', sans-serif", color: theme.text,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      transition: 'background 0.5s, color 0.5s, border-color 0.5s',
      minHeight: 0, minWidth: 0,
    }}>
      <div style={{ display: 'grid',
                    gridTemplateColumns: `${s.leftColW} repeat(7, 1fr)`,
                    borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
        <div />
        {weekDates.map(d => {
          const isToday = d.dayIdx === todayDayIdx
          return (
            <div key={d.dayIdx} style={{
              padding: 'clamp(4px, 0.5vh, 8px) 6px',
              textAlign: 'center', borderLeft: `1px solid ${theme.gridline}`,
              display: 'flex', alignItems: 'baseline', justifyContent: 'center',
              gap: 6,
              background: isToday ? theme.todayHeaderBg : 'transparent',
              borderTop: isToday ? `4px solid ${theme.todayAccent}` : '4px solid transparent',
              boxShadow: isToday ? `inset 0 -1px 0 ${theme.todayAccent}` : undefined,
            }}>
              <span style={{
                fontSize: s.dayLabelSize as any,
                color: isToday ? theme.todayAccent : theme.subtext,
                fontWeight: isToday ? 700 : 500,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {d.label}
              </span>
              <span style={{
                fontSize: s.dayNumSize as any,
                fontWeight: isToday ? 700 : 600,
                color: isToday ? theme.todayAccent : theme.text,
                lineHeight: 1.0,
              }}>
                {d.dateNum}
              </span>
            </div>
          )
        })}
      </div>

      {allDayEvents.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${s.leftColW} repeat(7, 1fr)`,
          borderBottom: `1px solid ${theme.border}`,
          padding: '4px 0', flexShrink: 0,
          background: isDark ? '#1A1A26' : '#F7F4EF',
        }}>
          <div style={{ fontSize: s.eventLocSize as any, color: theme.subtext,
                        textAlign: 'right', paddingRight: 6, paddingTop: 4 }}>
            all-day
          </div>
          {Array.from({ length: 7 }).map((_, dayIdx) => {
            const dayEvts = allDayEvents.filter(e => e.dayIdx === dayIdx)
            const isToday = dayIdx === todayDayIdx
            return (
              <div key={dayIdx} style={{
                borderLeft: `1px solid ${theme.gridline}`,
                padding: '3px 4px',
                display: 'flex', flexDirection: 'column', gap: 3,
                background: isToday ? theme.todayBg : 'transparent',
              }}>
                {dayEvts.map(e => {
                  const c = pickEventColor(e, members, isDark)
                  const driverName = driverNameOf(e.driverId)
                  const needsDriver = e.transportStatus === 'needs_driver' && !e.driverId
                  const carpoolNote = e.carpoolNote
                  return (
                    <div
                      key={e.id}
                      title={`${e.title}${driverName ? ' · driver: ' + driverName : ''}${carpoolNote ? ' · ' + carpoolNote : ''}`}
                      style={{
                      background: c.bg, color: c.fg,
                      fontSize: s.allDayBlockSize as any, fontWeight: 500,
                      padding: '3px 8px', borderRadius: 4,
                      lineHeight: 1.25,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {displayTitle(e)}
                      </div>
                      {(driverName || needsDriver || carpoolNote || (e.involvedIds && e.involvedIds.length > 0)) && (
                        <div style={{
                          marginTop: 2,
                          fontSize: s.eventLocSize as any,
                          opacity: 0.9,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {driverName && <span>driver: {driverName}</span>}
                            {needsDriver && <span>needs driver</span>}
                            {carpoolNote && <span>{driverName || needsDriver ? ' · ' : ''}{carpoolNote}</span>}
                          </div>
                          {e.involvedIds && e.involvedIds.length > 0 && (
                            <ChipRow
                              involvedIds={e.involvedIds}
                              members={members}
                              chipSize={s.chipSize as any}
                              chipFontSize={s.chipFontSize as any}
                              chipGap={s.chipGap} />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <div style={{
        position: 'relative', display: 'grid',
        gridTemplateColumns: `${s.leftColW} repeat(7, 1fr)`,
        flex: 1, minHeight: minGridHeight,
      }}>
        <div style={{ position: 'relative' }}>
          {Array.from({ length: endHour - startHour }).map((_, i) => {
            const hour = startHour + i
            const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM`
                          : hour === 12 ? '12 PM' : `${hour - 12} PM`
            return (
              <div key={i} style={{
                position: 'absolute',
                top: `${(i / (endHour - startHour)) * 100}%`,
                right: 8, fontSize: s.hourLabelSize as any, color: theme.subtext,
                fontWeight: 500, transform: 'translateY(-50%)',
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
              boxShadow: dayIdx === todayDayIdx
                ? `inset 3px 0 0 ${theme.todayAccent}, inset -1px 0 0 ${theme.todayAccent}`
                : undefined,
            }}>
              {Array.from({ length: endHour - startHour }).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: `${(i / (endHour - startHour)) * 100}%`,
                  left: 0, right: 0,
                  height: 1, background: theme.gridline,
                }} />
              ))}

              {dayEvts.map(e => {
                const c = pickEventColor(e, members, isDark)
                const top = pctTop(e.startMinutes)
                const heightPct = Math.max(pctHeight(e.startMinutes, e.endMinutes), 1.5)
                const blockStyle = eventBlockStyle(heightPct)
                const driverName = driverNameOf(e.driverId)
                const needsDriver = e.transportStatus === 'needs_driver' && !e.driverId
                const title = displayTitle(e)
                const isTinyBlock = heightPct < 4
                const carpoolNote = (e as any).carpoolNote as string | undefined

                // Active = currently happening, on today's column
                const isActiveNow =
                  dayIdx === todayDayIdx &&
                  e.startMinutes <= nowMinutes &&
                  e.endMinutes > nowMinutes

                return (
                  <div key={e.id}
                    title={`${e.title}${e.location ? ' · ' + e.location : ''}${driverName ? ' · driver: ' + driverName : ''}${carpoolNote ? ' · ' + carpoolNote : ''}`}
                    style={{
                      position: 'absolute',
                      top: `${top}%`,
                      height: `${heightPct}%`,
                      left: 3, right: 3,
                      background: c.bg, color: c.fg,
                      borderRadius: 5,
                      padding: blockStyle.pad,
                      fontSize: blockStyle.titleSize,
                      lineHeight: blockStyle.lineHeight,
                      boxShadow: isActiveNow
                        ? `0 0 0 3px ${theme.activeRing}, 0 2px 8px rgba(0,0,0,0.25)`
                        : '0 1px 3px rgba(0,0,0,0.18)',
                      borderLeft: needsDriver ? `4px solid ${theme.nowLine}` : undefined,
                      display: 'flex', flexDirection: 'column', gap: 0,
                      overflow: 'hidden',
                      zIndex: isActiveNow ? 2 : 1,
                    }}>
                    <div style={{
                      fontWeight: 600,
                      overflowWrap: 'anywhere',
                      whiteSpace: isTinyBlock ? 'nowrap' : 'normal',
                      overflow: isTinyBlock ? 'hidden' : 'visible',
                      textOverflow: isTinyBlock ? 'ellipsis' : 'clip',
                      display: isTinyBlock ? 'block' : '-webkit-box',
                      WebkitLineClamp: isTinyBlock ? undefined : 2,
                      WebkitBoxOrient: isTinyBlock ? undefined : 'vertical',
                      flexShrink: 0,
                    }}>
                      {title}
                    </div>
                    {blockStyle.showLocation && e.location && (
                      <div style={{ fontSize: blockStyle.locSize, opacity: 0.85,
                                    wordBreak: 'break-word' }}>
                        {e.location}
                      </div>
                    )}
                    {driverName && (
                      <div style={{
                        fontSize: blockStyle.locSize,
                        opacity: 0.95,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}>
                        🚗 {driverName}
                      </div>
                    )}
                    {needsDriver && (
                      <div style={{
                        fontSize: blockStyle.locSize,
                        opacity: 0.95,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}>
                        ⚠ needs driver
                      </div>
                    )}
                    {blockStyle.showCarpoolNote && carpoolNote && carpoolNote.trim() && (
                      <div style={{
                        fontSize: blockStyle.locSize,
                        opacity: 0.85,
                        fontStyle: 'italic',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}>
                        💬 {carpoolNote}
                      </div>
                    )}
                    {blockStyle.showChips && e.involvedIds && e.involvedIds.length > 0 && (
                      <ChipRow
                        involvedIds={e.involvedIds}
                        members={members}
                        chipSize={s.chipSize as any}
                        chipFontSize={s.chipFontSize as any}
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
            topPct={((nowMinutes - startHour * 60) / totalMin) * 100}
            timeColWidth={s.leftColW as any}
            color={theme.nowLine}
          />
        )}
      </div>

      {/* Dinner strip — only renders if there's at least one dinner with content */}
      {hasAnyDinner && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${s.leftColW} repeat(7, 1fr)`,
          borderTop: `1px solid ${theme.border}`,
          background: theme.dinnerBg,
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: s.eventLocSize as any,
            color: theme.dinnerLabel,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textAlign: 'right',
            paddingRight: 6,
            paddingTop: 6,
            paddingBottom: 6,
          }}>
            🍽
          </div>
          {Array.from({ length: 7 }).map((_, dayIdx) => {
            const slot = dinnerByDay.get(dayIdx)
            const meal = slot?.meal?.trim() ?? ''
            const cook = slot?.cook?.trim() ?? ''
            const cookColor = cookColorOf(cook)
            const isToday = dayIdx === todayDayIdx
            return (
              <div key={dayIdx} style={{
                borderLeft: `1px solid ${theme.gridline}`,
                padding: '5px 6px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                background: isToday ? theme.todayBg : 'transparent',
                minWidth: 0,
              }}>
                {meal ? (
                  <div style={{
                    fontSize: s.dinnerMealSize as any,
                    fontWeight: 600,
                    color: theme.text,
                    lineHeight: 1.15,
                    wordBreak: 'break-word',
                  }}>
                    {meal}
                  </div>
                ) : (
                  <div style={{
                    fontSize: s.dinnerMealSize as any,
                    color: theme.subtext,
                    fontStyle: 'italic',
                    opacity: 0.5,
                  }}>—</div>
                )}
                {cook && (
                  <div style={{
                    fontSize: s.dinnerCookSize as any,
                    color: theme.subtext,
                    display: 'flex', alignItems: 'center', gap: 4,
                    lineHeight: 1.15,
                  }}>
                    {cookColor && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: cookColor, flexShrink: 0,
                      }} />
                    )}
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{cook}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {events.length === 0 && (
        <div style={{
          textAlign: 'center', color: theme.subtext,
          fontSize: 'clamp(13px, 1vw, 18px)',
          padding: '20px 0', fontStyle: 'italic',
        }}>
          No events this week
        </div>
      )}
    </div>
  )
}

function NowLine({ dayIdx, topPct, timeColWidth, color }: {
  dayIdx: number; topPct: number; timeColWidth: string; color: string;
}) {
  return (
    <div style={{
      position: 'absolute', top: `${topPct}%`,
      left: timeColWidth, right: 0,
      height: 0, pointerEvents: 'none', zIndex: 2,
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
