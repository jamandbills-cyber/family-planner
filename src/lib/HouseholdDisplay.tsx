'use client'

import { useEffect, useMemo, useState } from 'react'
import WeekCalendar from '@/lib/WeekCalendar'
import type { DashboardCalendarEvent } from '@/lib/types/calendar'
import type {
  DisplayColumn,
  DisplayOrientation,
  DisplaySourceStatus,
  HouseholdDisplayData,
} from '@/lib/types/display'

type Props = {
  initialData: HouseholdDisplayData
  orientation: DisplayOrientation
  deviceToken?: string
}

type DisplayTheme = {
  bg: string
  card: string
  border: string
  text: string
  subtext: string
  railBg: string
  muted: string
  accent: string
  danger: string
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h < 12 ? 'AM' : 'PM'
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${hr} ${period}` : `${hr}:${String(m).padStart(2, '0')} ${period}`
}

function buildTheme(isDark: boolean): DisplayTheme {
  return isDark ? {
    bg: '#0F0F1A',
    card: '#1E1E2E',
    border: '#2A2A3A',
    text: '#F0EDE7',
    subtext: '#8B8599',
    railBg: '#1A1A26',
    muted: '#15151F',
    accent: '#FFB088',
    danger: '#F87171',
  } : {
    bg: '#F7F4EF',
    card: '#fff',
    border: '#E2DDD6',
    text: '#1A1A2E',
    subtext: '#8B8599',
    railBg: '#fff',
    muted: '#F7F4EF',
    accent: '#C4522A',
    danger: '#DC2626',
  }
}

function eventColor(e: DashboardCalendarEvent, members: HouseholdDisplayData['members']): string {
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

function sourceProblem(sources: HouseholdDisplayData['sources']): string | null {
  const failed = Object.entries(sources).filter(([, source]) => !source.ok)
  if (failed.length === 0) return null
  return failed.map(([name]) => name).join(', ')
}

function HealthIndicator({ data, theme }: { data: HouseholdDisplayData; theme: DisplayTheme }) {
  const problem = sourceProblem(data.sources)
  const label = new Date(data.syncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      fontSize: 'clamp(9px, 0.75vw, 11px)',
      color: problem ? theme.danger : theme.subtext,
      minWidth: 0,
    }}>
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {problem ? `Issue: ${problem}` : 'All systems current'}
      </span>
      <span style={{ flexShrink: 0 }}>Updated {label}</span>
    </div>
  )
}

function SourceFallback({ label, status, theme }: {
  label: string
  status?: DisplaySourceStatus
  theme: DisplayTheme
}) {
  return (
    <div style={{
      flex: 1,
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.danger,
      fontSize: 'clamp(13px, 1vw, 16px)',
      fontStyle: 'italic',
      textAlign: 'center',
    }}>
      {label}{status?.error ? `: ${status.error}` : ''}
    </div>
  )
}

function CalendarPanel({ data, theme, isDark }: {
  data: HouseholdDisplayData
  theme: DisplayTheme
  isDark: boolean
}) {
  if (!data.calendar) {
    return <SourceFallback label="Calendar unavailable" status={data.sources.calendar} theme={theme} />
  }

  return (
    <WeekCalendar
      events={data.calendar.events}
      syncedAt={data.calendar.syncedAt}
      weekStart={data.calendar.weekStart}
      density="tv"
      poll={false}
      members={data.members}
      darkMode={isDark}
      fillHeight
      dinner={data.dinner}
    />
  )
}

function getPreviewEvents(data: HouseholdDisplayData, now: Date) {
  if (!data.calendar) return { label: 'Today', events: [] as DashboardCalendarEvent[] }
  const start = new Date(data.calendar.weekStart + 'T00:00:00')
  const todayIdx = Math.floor((new Date(now.toDateString()).getTime() - start.getTime()) / 86400000)
  if (todayIdx < 0 || todayIdx > 6) return { label: 'Today', events: [] as DashboardCalendarEvent[] }

  const isPostEvening = now.getHours() >= 20
  const targetIdx = isPostEvening ? todayIdx + 1 : todayIdx
  if (targetIdx > 6) return { label: isPostEvening ? 'Tomorrow' : 'Today', events: [] as DashboardCalendarEvent[] }

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const events = data.calendar.events
    .filter(e => e.dayIdx === targetIdx)
    .filter(e => isPostEvening || e.allDay || e.endMinutes > nowMin - 30)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return a.startMinutes - b.startMinutes
    })
    .slice(0, 6)

  return { label: isPostEvening ? 'Tomorrow' : 'Today', events }
}

function TodayPanel({ data, now, theme }: {
  data: HouseholdDisplayData
  now: Date
  theme: DisplayTheme
}) {
  const preview = useMemo(() => getPreviewEvents(data, now), [data, now])
  const memberById = useMemo(() => new Map(data.members.map(m => [m.id, m])), [data.members])

  return (
    <div style={{
      background: theme.railBg,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 'clamp(8px, 1vh, 14px)',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 'clamp(10px, 0.85vw, 12px)',
        fontWeight: 700,
        color: theme.subtext,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
        flexShrink: 0,
      }}>
        {preview.label}
      </div>
      {preview.events.length === 0 ? (
        <div style={{ fontSize: 'clamp(11px, 0.9vw, 13px)', color: theme.subtext, fontStyle: 'italic' }}>
          Nothing coming up
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.6vh, 8px)', overflow: 'hidden', flex: 1, minHeight: 0 }}>
          {preview.events.map(e => {
            const driver = e.transportType === 'both'
              ? [
                  e.dropoffDriverId || e.driverId ? `drop: ${memberById.get((e.dropoffDriverId ?? e.driverId)!)?.display_name ?? 'carpool'}` : null,
                  e.pickupDriverId || e.driverId ? `pick: ${memberById.get((e.pickupDriverId ?? e.driverId)!)?.display_name ?? 'carpool'}` : null,
                ].filter(Boolean).join(' · ')
              : e.driverId ? memberById.get(e.driverId)?.display_name : null
            const needsDriver = e.transportStatus === 'needs_driver' && (
              e.transportType === 'both'
                ? !(e.dropoffDriverId ?? e.driverId) || !(e.pickupDriverId ?? e.driverId)
                : !e.driverId
            )
            const needed = e.involvedIds?.map(id => memberById.get(id)?.display_name).filter(Boolean).join(', ')
            return (
              <div key={e.id} style={{ display: 'flex', gap: 6, fontSize: 'clamp(10px, 0.85vw, 13px)', lineHeight: 1.25, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: eventColor(e, data.members), marginTop: 5, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: theme.subtext, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {e.allDay ? 'all day' : formatTime(e.startMinutes)}
                    {driver ? ` · ${driver}` : needsDriver ? ' · needs driver' : ''}
                  </div>
                  <div style={{ color: theme.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.title}
                  </div>
                  {needed && (
                    <div style={{ color: theme.subtext, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {needed}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ClockPanel({ now, theme }: { now: Date; theme: DisplayTheme }) {
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return (
    <div style={{
      background: theme.railBg,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: 'clamp(10px, 1.2vh, 18px)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 'clamp(11px, 0.95vw, 14px)', fontWeight: 600, color: theme.subtext, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {dayName}
      </div>
      <div style={{ fontSize: 'clamp(40px, 4.2vw, 64px)', fontWeight: 700, lineHeight: 1, margin: '4px 0', fontFamily: "'Playfair Display', serif", color: theme.text, letterSpacing: '-0.02em' }}>
        {timeStr}
      </div>
      <div style={{ fontSize: 'clamp(11px, 0.95vw, 14px)', color: theme.subtext, fontWeight: 500 }}>
        {dateStr}
      </div>
    </div>
  )
}

type MediaPanelProps = {
  data: HouseholdDisplayData
  photoIdx: number
  photoVisible: boolean
  deviceToken?: string
  theme: DisplayTheme
  compact?: boolean
}

function PhotoPanel({ data, photoIdx, photoVisible, theme, compact = false }: MediaPanelProps) {
  const photo = data.photos[photoIdx]
  return (
    <div style={{
      background: data.photos.length === 0 ? theme.muted : '#1A1A2E',
      border: `1px solid ${theme.border}`,
      borderRadius: compact ? 10 : 12,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      aspectRatio: compact ? undefined : '4 / 3',
      minHeight: 0,
    }}>
      {photo ? (
        <img key={photo} src={photo} alt="" style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: photoVisible ? 1 : 0,
          transition: 'opacity 0.6s ease-in-out',
        }} />
      ) : (
        <div style={{ fontSize: 'clamp(10px, 0.8vw, 13px)', color: theme.subtext, fontStyle: 'italic', textAlign: 'center', padding: 8 }}>
          No photos
        </div>
      )}
    </div>
  )
}

function QrPanel({ deviceToken, theme, compact = false }: MediaPanelProps) {
  const qrSrc = deviceToken ? `/api/qr/${deviceToken}` : null
  return (
    <div style={{
      background: theme.railBg,
      border: `1px solid ${theme.border}`,
      borderRadius: compact ? 10 : 12,
      padding: compact ? 8 : 'clamp(8px, 1vh, 14px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    }}>
      {qrSrc ? (
        <img src={qrSrc} alt="Scan to add" style={{
          width: compact ? 80 : 'clamp(80px, 8vw, 120px)',
          height: compact ? 80 : 'clamp(80px, 8vw, 120px)',
          background: '#fff',
          borderRadius: 6,
          imageRendering: 'pixelated',
        }} />
      ) : (
        <div style={{ fontSize: 11, color: theme.subtext }}>No token</div>
      )}
      <div style={{ fontSize: 'clamp(10px, 0.8vw, 12px)', color: theme.subtext, fontWeight: 500 }}>
        scan to add
      </div>
    </div>
  )
}

function PhotoQrPanel(props: MediaPanelProps) {
  return (
    <>
      <PhotoPanel {...props} />
      <QrPanel {...props} />
    </>
  )
}

function sortedTasks(col: DisplayColumn) {
  return [...col.tasks].sort((a, b) => {
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date)
    return a.text.localeCompare(b.text)
  })
}

function FamilyTaskCard({ col, theme, maxTasks, compact = false }: {
  col: DisplayColumn
  theme: DisplayTheme
  maxTasks: number
  compact?: boolean
}) {
  const isPlaceholder = col.member.id.startsWith('__empty__')
  const tasks = sortedTasks(col)
  const isEmpty = !isPlaceholder && tasks.length === 0 && col.ideas.length === 0
  const visibleTasks = tasks.slice(0, maxTasks)
  const hiddenTasks = Math.max(0, tasks.length - visibleTasks.length)

  if (isPlaceholder) {
    return <div style={{ background: theme.muted, border: `1px dashed ${theme.border}`, borderRadius: 10, opacity: 0.25, minHeight: 0, minWidth: 0 }} />
  }

  return (
    <div style={{
      background: isEmpty ? theme.muted : theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      overflow: 'hidden',
      minHeight: 0,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      opacity: isEmpty ? 0.7 : 1,
    }}>
      <div style={{ height: compact ? 5 : 'clamp(4px, 0.5vh, 6px)', background: col.member.color ?? '#888780', flexShrink: 0 }} />
      <div style={{
        padding: compact ? '6px 10px 4px' : 'clamp(6px, 0.8vh, 10px) clamp(10px, 0.9vw, 14px) 4px',
        fontSize: compact ? 'clamp(14px, 1.05vw, 17px)' : 'clamp(15px, 1.3vw, 22px)',
        fontWeight: 700,
        color: theme.text,
        lineHeight: 1.1,
        flexShrink: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {col.member.display_name}
      </div>
      {isEmpty ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: theme.subtext, fontStyle: 'italic' }}>
          -
        </div>
      ) : (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)' }}>
          <div style={{ padding: compact ? '0 10px 10px' : '0 clamp(10px, 0.9vw, 14px) clamp(8px, 1vh, 12px)', fontSize: compact ? 'clamp(11px, 0.82vw, 13px)' : 'clamp(11px, 0.95vw, 14px)', lineHeight: compact ? 1.32 : 1.4, color: theme.text }}>
            {visibleTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 6, marginBottom: 4, minWidth: 0 }}>
                <span style={{ color: t.due_date ? theme.accent : theme.subtext, flexShrink: 0 }}>-</span>
                <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }}>
                  {t.text}
                </span>
              </div>
            ))}
            {hiddenTasks > 0 && (
              <div style={{ marginTop: 4, fontSize: 'clamp(10px, 0.8vw, 12px)', color: theme.subtext, fontWeight: 600 }}>
                +{hiddenTasks} more task{hiddenTasks === 1 ? '' : 's'}
              </div>
            )}
            {col.ideas.length > 0 && (
              <div style={{ marginTop: visibleTasks.length > 0 ? 6 : 0, paddingTop: visibleTasks.length > 0 ? 6 : 0, borderTop: visibleTasks.length > 0 ? `1px dashed ${theme.border}` : 'none', fontSize: 'clamp(10px, 0.8vw, 12px)', color: theme.subtext }}>
                {col.ideas.length} idea{col.ideas.length === 1 ? '' : 's'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FamilyTasksPanel({ data, theme, orientation }: {
  data: HouseholdDisplayData
  theme: DisplayTheme
  orientation: DisplayOrientation
}) {
  if (orientation === 'portrait') {
    const padded = [...data.columns]
    while (padded.length < 8) {
      padded.push({ member: { id: `__empty__${padded.length}`, display_name: '', color: null, type: 'child' }, tasks: [], ideas: [] })
    }
    const visible = padded.slice(0, 8)
    const topRow = visible.slice(0, 4)
    const bottomRow = visible.slice(4, 8)
    const colWidthFor = (col: DisplayColumn) => {
      const isPlaceholder = col.member.id.startsWith('__empty__')
      if (isPlaceholder) return '0.4fr'
      if (col.tasks.length === 0 && col.ideas.length === 0) return '0.7fr'
      return '1.6fr'
    }
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: topRow.map(colWidthFor).join(' '), gap: 8, minHeight: 0 }}>
          {topRow.map(col => <FamilyTaskCard key={col.member.id} col={col} theme={theme} maxTasks={3} compact />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: bottomRow.map(colWidthFor).join(' '), gap: 8, minHeight: 0 }}>
          {bottomRow.map(col => <FamilyTaskCard key={col.member.id} col={col} theme={theme} maxTasks={3} compact />)}
        </div>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 'clamp(4px, 0.6vw, 10px)', minHeight: 0 }}>
      {data.columns.map(col => {
        const isEmpty = col.tasks.length === 0 && col.ideas.length === 0
        if (isEmpty) {
          return (
            <div key={col.member.id} style={{ flex: '0 0 clamp(36px, 3vw, 48px)', background: theme.muted, border: `1px solid ${theme.border}`, borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: 0.7 }}>
              <div style={{ height: 'clamp(4px, 0.5vh, 6px)', background: col.member.color ?? '#888780' }} />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl' as any, textOrientation: 'mixed' as any, fontSize: 'clamp(13px, 1vw, 16px)', fontWeight: 600, color: theme.subtext, padding: '8px 0' }}>
                {col.member.display_name}
              </div>
            </div>
          )
        }
        return (
          <div key={col.member.id} style={{ flex: '1 1 0', minWidth: 0 }}>
            <FamilyTaskCard col={col} theme={theme} maxTasks={4} />
          </div>
        )
      })}
    </div>
  )
}

function DisplayShell({ data, now, theme, isDark, orientation, photoIdx, photoVisible, deviceToken }: {
  data: HouseholdDisplayData
  now: Date
  theme: DisplayTheme
  isDark: boolean
  orientation: DisplayOrientation
  photoIdx: number
  photoVisible: boolean
  deviceToken?: string
}) {
  if (orientation === 'portrait') {
    return (
      <div style={{ width: '100%', height: '100%', background: theme.bg, color: theme.text, fontFamily: "'DM Sans', sans-serif", display: 'grid', gridTemplateRows: '5fr 1.4fr 1.4fr auto', gap: 10, padding: 12, overflow: 'hidden', transition: 'background 0.5s, color 0.5s', minHeight: 0, boxSizing: 'border-box' }}>
        <div style={{ minHeight: 0, display: 'flex' }}>
          <CalendarPanel data={data} theme={theme} isDark={isDark} />
        </div>
        <FamilyTasksPanel data={data} theme={theme} orientation="portrait" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.2fr 1fr', gap: 8, height: 'clamp(130px, 14vh, 150px)', minHeight: 0 }}>
          <ClockPanel now={now} theme={theme} />
          <TodayPanel data={data} now={now} theme={theme} />
          <PhotoQrPanel data={data} photoIdx={photoIdx} photoVisible={photoVisible} deviceToken={deviceToken} theme={theme} compact />
        </div>
        <HealthIndicator data={data} theme={theme} />
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', width: '100vw', background: theme.bg, color: theme.text, fontFamily: "'DM Sans', sans-serif", display: 'grid', gridTemplateColumns: '1fr clamp(220px, 18vw, 280px)', gridTemplateRows: '1fr clamp(180px, 24vh, 280px) auto', gridTemplateAreas: `"calendar rail" "family family" "health health"`, gap: 'clamp(8px, 1vh, 14px)', padding: 'clamp(8px, 1vh, 14px)', overflow: 'hidden', transition: 'background 0.5s, color 0.5s' }}>
      <div style={{ gridArea: 'calendar', minWidth: 0, minHeight: 0, display: 'flex' }}>
        <CalendarPanel data={data} theme={theme} isDark={isDark} />
      </div>
      <div style={{ gridArea: 'rail', minHeight: 0, display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 'clamp(6px, 0.8vh, 12px)' }}>
        <ClockPanel now={now} theme={theme} />
        <PhotoPanel data={data} photoIdx={photoIdx} photoVisible={photoVisible} deviceToken={deviceToken} theme={theme} />
        <TodayPanel data={data} now={now} theme={theme} />
        <QrPanel data={data} photoIdx={photoIdx} photoVisible={photoVisible} deviceToken={deviceToken} theme={theme} />
      </div>
      <div style={{ gridArea: 'family', minHeight: 0 }}>
        <FamilyTasksPanel data={data} theme={theme} orientation="landscape" />
      </div>
      <div style={{ gridArea: 'health', minHeight: 0 }}>
        <HealthIndicator data={data} theme={theme} />
      </div>
    </div>
  )
}

export default function HouseholdDisplay({ initialData, orientation, deviceToken }: Props) {
  const [data, setData] = useState(initialData)
  const [now, setNow] = useState(new Date())
  const [photoIdx, setPhotoIdx] = useState(0)
  const [photoVisible, setPhotoVisible] = useState(true)
  const [vp, setVp] = useState({ w: 1920, h: 1080 })
  const [refreshError, setRefreshError] = useState<string | null>(null)

  useEffect(() => { setData(initialData) }, [initialData])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch('/api/dashboard/display')
        if (!res.ok) throw new Error(`Display refresh failed (${res.status})`)
        const fresh = await res.json()
        setData(fresh)
        setRefreshError(null)
      } catch (err) {
        setRefreshError(err instanceof Error ? err.message : 'Display refresh failed')
      }
    }
    refresh()
    const t = setInterval(refresh, 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (data.photos.length <= 1) return
    const rotate = setInterval(() => {
      setPhotoVisible(false)
      setTimeout(() => {
        setPhotoIdx(i => (i + 1) % data.photos.length)
        setPhotoVisible(true)
      }, 600)
    }, 3 * 60_000)
    return () => clearInterval(rotate)
  }, [data.photos.length])

  useEffect(() => {
    if (photoIdx >= data.photos.length) setPhotoIdx(0)
  }, [data.photos.length, photoIdx])

  useEffect(() => {
    if (orientation !== 'portrait') return
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [orientation])

  const isDark = now.getHours() >= 19 || now.getHours() < 7
  const theme = buildTheme(isDark)

  const shell = (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DisplayShell
        data={data}
        now={now}
        theme={theme}
        isDark={isDark}
        orientation={orientation}
        photoIdx={photoIdx}
        photoVisible={photoVisible}
        deviceToken={deviceToken}
      />
      {refreshError && (
        <div style={{ position: 'absolute', right: 14, bottom: 14, zIndex: 5, maxWidth: 420, padding: '8px 12px', borderRadius: 10, background: isDark ? 'rgba(127,29,29,0.9)' : 'rgba(254,242,242,0.96)', border: `1px solid ${isDark ? 'rgba(252,165,165,0.45)' : '#FECACA'}`, color: isDark ? '#FCA5A5' : '#DC2626', fontSize: 12, fontWeight: 700 }}>
          Showing last display data. {refreshError}
        </div>
      )}
    </div>
  )

  if (orientation !== 'portrait') return shell

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: theme.bg }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: vp.h, height: vp.w, transform: 'translate(-50%, -50%) rotate(-90deg)', transformOrigin: 'center center' }}>
        {shell}
      </div>
    </div>
  )
}
