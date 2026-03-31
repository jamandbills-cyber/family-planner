'use client'

import { useState, useCallback } from 'react'
import {
  Calendar, RefreshCw, Plus, X, Car, CheckCircle, AlertTriangle,
  Clock, ChevronDown, ChevronUp, Undo2, Send, Loader2
} from 'lucide-react'
import type { CalendarEvent, StandingRule, DinnerEntry } from '@/lib/types'
import { FAMILY_MEMBERS, ADULTS, KIDS, getMember } from '@/lib/family'

// ─── Week display helpers ─────────────────────────────────────
const WEEK_LABELS = [
  { label: 'Monday',    short: 'Mon' },
  { label: 'Tuesday',   short: 'Tue' },
  { label: 'Wednesday', short: 'Wed' },
  { label: 'Thursday',  short: 'Thu' },
  { label: 'Friday',    short: 'Fri' },
  { label: 'Saturday',  short: 'Sat' },
  { label: 'Sunday',    short: 'Sun' },
]

const STATUS_META = {
  unset:        { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  needs_driver: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  no_transport: { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  assigned:     { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
}

function resolvedStatus(evt: CalendarEvent) {
  if (evt.transportStatus === 'needs_driver' && evt.driverId) return 'assigned'
  return evt.transportStatus
}

// ─── Initial standing rules (saved to DB in production) ───────
const INIT_RULES: StandingRule[] = []

export default function AdminSetupClient() {
  const [events,      setEvents]      = useState<CalendarEvent[]>([])
  const [rules,       setRules]       = useState<StandingRule[]>(INIT_RULES)
  const [dinner,      setDinner]      = useState<DinnerEntry[]>(
    WEEK_LABELS.map((_, i) => ({ dayIdx: i, meal: '', cook: '' }))
  )
  const [agenda,      setAgenda]      = useState<string[]>([])
  const [newAgenda,   setNewAgenda]   = useState('')
  const [deadline,    setDeadline]    = useState('17:00')
  const [deadlineDay, setDeadlineDay] = useState<'saturday' | 'sunday'>('sunday')
  const [isReady,     setIsReady]     = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [lastSynced,  setLastSynced]  = useState<string | null>(null)
  const [weekLabel,   setWeekLabel]   = useState('This Week')
  const [weekDates,   setWeekDates]   = useState<string[]>(WEEK_LABELS.map(() => ''))
  const [syncError,   setSyncError]   = useState<string | null>(null)
  const [rulesOpen,   setRulesOpen]   = useState(false)
  const [addRuleOpen, setAddRuleOpen] = useState(false)
  const [newRule,     setNewRule]     = useState({ driverId: '', passengerId: '', recurrence: '' })
  const [selectedId,  setSelectedId]  = useState<string | null>(null)

  // ─── Sync with Google Calendar ──────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/calendar')
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = await res.json()

      // Apply standing rules to incoming events
      const eventsWithRules = (data.events as CalendarEvent[]).map(evt => {
        const matchingRule = rules.find(r =>
          !r.overrideThisWeek &&
          evt.title.toLowerCase().includes(getMember(r.passengerId)?.name.toLowerCase() ?? '')
        )
        if (matchingRule) {
          return {
            ...evt,
            transportStatus: 'needs_driver' as const,
            driverId: matchingRule.driverId,
            standingRuleId: matchingRule.id,
          }
        }
        return evt
      })

      setEvents(eventsWithRules)
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

      // Build week date display strings from weekStart
      if (data.weekStart) {
        const start = new Date(data.weekStart + 'T00:00:00')
        const dates = WEEK_LABELS.map((_, i) => {
          const d = new Date(start)
          d.setDate(d.getDate() + i)
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
        setWeekDates(dates)
        setWeekLabel(`Week of ${dates[0]}`)
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [rules])

  // ─── Event handlers ─────────────────────────────────────────
  const setTransportStatus = (id: string, status: CalendarEvent['transportStatus']) =>
    setEvents(ev => ev.map(e => e.id === id
      ? { ...e, transportStatus: status, driverId: status !== 'needs_driver' ? null : e.driverId }
      : e))

  const assignDriver = (eventId: string, val: string) =>
    setEvents(ev => ev.map(e => e.id === eventId ? { ...e, driverId: val || null } : e))

  const updateCarpoolNote = (eventId: string, note: string) =>
    setEvents(ev => ev.map(e => e.id === eventId ? { ...e, carpoolNote: note } : e))

  const toggleMember = (eventId: string, memberId: string) =>
    setEvents(ev => ev.map(e => {
      if (e.id !== eventId) return e
      const has = e.involvedIds.includes(memberId)
      return { ...e, involvedIds: has ? e.involvedIds.filter(i => i !== memberId) : [...e.involvedIds, memberId] }
    }))

  const toggleRuleOverride = (ruleId: string) =>
    setRules(r => r.map(rule => rule.id === ruleId ? { ...rule, overrideThisWeek: !rule.overrideThisWeek } : rule))

  const addRule = () => {
    if (!newRule.driverId || !newRule.passengerId || !newRule.recurrence) return
    const d = getMember(newRule.driverId), p = getMember(newRule.passengerId)
    if (!d || !p) return
    setRules(r => [...r, {
      id: 'sr' + Date.now(),
      label: `${d.name} drives ${p.name} (${newRule.recurrence})`,
      ...newRule,
      overrideThisWeek: false,
    }])
    setNewRule({ driverId: '', passengerId: '', recurrence: '' })
    setAddRuleOpen(false)
  }

  const updateDinner = (dayIdx: number, field: keyof DinnerEntry, value: string) =>
    setDinner(d => d.map(s => s.dayIdx === dayIdx ? { ...s, [field]: value } : s))

  const addAgendaItem = () => {
    if (!newAgenda.trim()) return
    setAgenda(a => [...a, newAgenda.trim()])
    setNewAgenda('')
  }

  // ─── Derived state ──────────────────────────────────────────
  const gaps  = events.filter(e => e.transportStatus === 'needs_driver' && !e.driverId)
  const unset = events.filter(e => e.transportStatus === 'unset')
  const sel   = events.find(e => e.id === selectedId)
  const eventsByDay = WEEK_LABELS.map((_, i) =>
    events.filter(e => e.dayIdx === i).sort((a, b) => a.sortMin - b.sortMin)
  )

  // ─── Styles (same design system as prototype) ───────────────
  const s = {
    card:     { background: '#fff', borderRadius: 12, border: '1px solid #E8E3DB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' } as React.CSSProperties,
    btnPri:   { background: '#C4522A', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnSec:   { background: '#fff', color: '#4A4A5A', border: '1.5px solid #DDD8CF', borderRadius: 8, padding: '8px 14px', fontFamily: "'DM Sans',sans-serif", fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnGhost: { background: 'none', border: 'none', cursor: 'pointer', color: '#C4B8A8', padding: 4, display: 'flex', alignItems: 'center' } as React.CSSProperties,
    field:    { border: '1.5px solid #E2DDD6', borderRadius: 6, padding: '5px 7px', fontSize: 11, color: '#1A1A2E', background: '#fff', fontFamily: "'DM Sans',sans-serif", width: '100%' } as React.CSSProperties,
    select:   { background: '#fff', border: '1.5px solid #DDD8CF', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: '#2C2C3E', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" } as React.CSSProperties,
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: '#F7F4EF', minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ background: '#1A1A2E', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#7070A0', textTransform: 'uppercase', marginBottom: 4 }}>
              Family Weekly Planner · Admin Setup
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700 }}>
              {weekLabel}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastSynced && <span style={{ fontSize: 12, color: '#7070A0' }}>Synced: {lastSynced}</span>}
            <button style={{ ...s.btnSec, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff' }}
              onClick={handleSync} disabled={syncing}>
              {syncing
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <RefreshCw size={13} />
              }
              {syncing ? 'Syncing…' : events.length === 0 ? 'Load Calendar' : 'Re-sync Calendar'}
            </button>
          </div>
        </div>

        {syncError && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(220,38,38,0.2)' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '9px 24px', fontSize: 13, color: '#FCA5A5' }}>
              ⚠ Calendar sync failed: {syncError}. Check that your Google Calendar ID is correct in .env.
            </div>
          </div>
        )}

        {(gaps.length > 0 || unset.length > 0) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(217,119,6,0.18)' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '9px 24px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {gaps.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#FCD34D' }}>
                  <AlertTriangle size={13} />
                  <strong>{gaps.length} need{gaps.length === 1 ? 's' : ''} a driver:</strong>&nbsp;
                  {gaps.map(g => g.title).join(' · ')}
                </span>
              )}
              {unset.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#FCA5A5' }}>
                  <AlertTriangle size={13} />
                  <strong>{unset.length} transport status not set:</strong>&nbsp;
                  {unset.map(g => g.title).join(' · ')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 60px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Empty state — prompt to sync */}
        {events.length === 0 && !syncing && (
          <div style={{ ...s.card, padding: 40, textAlign: 'center' }}>
            <Calendar size={40} style={{ color: '#C4B8A8', margin: '0 auto 16px' }} />
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 600, color: '#1A1A2E', marginBottom: 8 }}>
              No events loaded yet
            </div>
            <p style={{ fontSize: 14, color: '#8B8599', marginBottom: 20 }}>
              Click "Load Calendar" above to pull this week's events from your Google Calendar.
            </p>
            <button style={{ ...s.btnPri }} onClick={handleSync}>
              <RefreshCw size={14} /> Load Calendar
            </button>
          </div>
        )}

        {/* WEEK CALENDAR */}
        {events.length > 0 && (
          <div style={s.card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={15} style={{ color: '#C4522A' }} />
                <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>This Week</span>
                <span style={{ fontSize: 11, background: '#F0EDE8', color: '#8B8599', padding: '2px 8px', borderRadius: 12 }}>{events.length} events</span>
              </div>
              <span style={{ fontSize: 12, color: '#B0A898', fontStyle: 'italic' }}>Click any event to assign people &amp; transport</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(128px, 1fr))', minWidth: 896 }}>
                {/* Day headers */}
                {WEEK_LABELS.map((day, i) => (
                  <div key={i} style={{ padding: '10px 10px 7px', borderBottom: '2px solid #EDE8E0', borderRight: i < 6 ? '1px solid #EDE8E0' : 'none', background: '#FAFAF7' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{day.short}</div>
                    <div style={{ fontSize: 11, color: '#A09898', marginTop: 1 }}>{weekDates[i]}</div>
                  </div>
                ))}

                {/* Event + dinner columns */}
                {WEEK_LABELS.map((_, dayIdx) => {
                  const dayEvts = eventsByDay[dayIdx]
                  const din = dinner[dayIdx]
                  return (
                    <div key={dayIdx} style={{ padding: '8px 6px', borderRight: dayIdx < 6 ? '1px solid #EDE8E0' : 'none', minHeight: 160, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1 }}>
                        {dayEvts.length === 0 && (
                          <div style={{ fontSize: 11, color: '#C4B8A8', fontStyle: 'italic', textAlign: 'center', paddingTop: 10 }}>Free</div>
                        )}
                        {dayEvts.map(evt => {
                          const status = resolvedStatus(evt)
                          const sm = STATUS_META[status]
                          const isSelected = selectedId === evt.id
                          const firstPerson = getMember(evt.involvedIds[0] ?? '')
                          return (
                            <div key={evt.id}
                              onClick={() => setSelectedId(isSelected ? null : evt.id)}
                              style={{ borderRadius: 7, padding: '6px 8px', cursor: 'pointer', marginBottom: 5,
                                background: sm.bg,
                                border: `1px solid ${isSelected ? '#C4522A' : sm.border}`,
                                borderLeft: `3px solid ${firstPerson?.color ?? sm.color}`,
                                outline: isSelected ? '2.5px solid #C4522A' : 'none',
                                outlineOffset: 1,
                              }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A2E', lineHeight: 1.3 }}>{evt.title}</div>
                              <div style={{ fontSize: 10, color: '#8B8599', marginTop: 1 }}>{evt.time}</div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  {evt.involvedIds.length === 0
                                    ? <span style={{ fontSize: 9, color: '#EF4444', fontStyle: 'italic' }}>Unassigned</span>
                                    : evt.involvedIds.slice(0, 5).map(id => {
                                        const m = getMember(id)
                                        return m ? (
                                          <span key={id} title={m.name} style={{ width: 13, height: 13, borderRadius: '50%', background: m.color, color: '#fff', fontSize: 7, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {m.name[0]}
                                          </span>
                                        ) : null
                                      })
                                  }
                                </div>
                                <span style={{ fontSize: 10, color: sm.color }}>●</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Dinner */}
                      <div style={{ borderTop: '1px dashed #E2DDD6', paddingTop: 6, marginTop: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#B0A898', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>🍽 Dinner</div>
                        <input style={s.field} type="text" value={din.meal}
                          onChange={e => updateDinner(dayIdx, 'meal', e.target.value)} placeholder="Meal?" />
                        <input style={{ ...s.field, marginTop: 3 }} type="text" value={din.cook}
                          onChange={e => updateDinner(dayIdx, 'cook', e.target.value)} placeholder="Who cooks?" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Edit panel */}
            {sel && (
              <div style={{ borderTop: '2px solid #C4522A', background: '#1A1A2E', borderRadius: '0 0 12px 12px', padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{sel.title}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {sel.time}{sel.location ? ` · ${sel.location}` : ''}
                      {sel.standingRuleId && (
                        <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', color: '#93C5FD', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
                          Standing rule applies
                        </span>
                      )}
                    </div>
                  </div>
                  <button style={s.btnGhost} onClick={() => setSelectedId(null)}>
                    <X size={18} color="rgba(255,255,255,0.35)" />
                  </button>
                </div>

                {/* Who's involved */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 9 }}>
                    Who's involved — tap to assign
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {ADULTS.map(m => {
                      const on = sel.involvedIds.includes(m.id)
                      return (
                        <button key={m.id} onClick={() => toggleMember(sel.id, m.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.1s', border: `1.5px solid ${on ? m.color : 'rgba(255,255,255,0.12)'}`, background: on ? m.color : 'rgba(255,255,255,0.07)', color: on ? '#fff' : 'rgba(255,255,255,0.42)', fontWeight: on ? 600 : 400 }}>
                          <span style={{ width: 15, height: 15, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.25)' : m.color, color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.name[0]}</span>
                          {m.name}
                        </button>
                      )
                    })}
                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
                    {KIDS.map(m => {
                      const on = sel.involvedIds.includes(m.id)
                      return (
                        <button key={m.id} onClick={() => toggleMember(sel.id, m.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.1s', border: `1.5px solid ${on ? m.color : 'rgba(255,255,255,0.12)'}`, background: on ? m.color : 'rgba(255,255,255,0.07)', color: on ? '#fff' : 'rgba(255,255,255,0.42)', fontWeight: on ? 600 : 400 }}>
                          <span style={{ width: 15, height: 15, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.25)' : m.color, color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.name[0]}</span>
                          {m.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Transport */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 9 }}>Transportation</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      { val: 'needs_driver' as const, label: '🚗 Needs Driver',       ac: '#FEF9C3', bc: '#FDE68A', tc: '#92400E' },
                      { val: 'no_transport' as const, label: '✓ No Transport Needed', ac: '#DCFCE7', bc: '#86EFAC', tc: '#14532D' },
                    ]).map(opt => {
                      const active = sel.transportStatus === opt.val
                      return (
                        <button key={opt.val}
                          onClick={() => setTransportStatus(sel.id, active ? 'unset' : opt.val)}
                          style={{ padding: '6px 13px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.1s', border: `1.5px solid ${active ? opt.bc : 'rgba(255,255,255,0.15)'}`, background: active ? opt.ac : 'rgba(255,255,255,0.08)', color: active ? opt.tc : 'rgba(255,255,255,0.55)', fontWeight: active ? 700 : 400 }}>
                          {opt.label}
                        </button>
                      )
                    })}
                    {sel.transportStatus === 'unset' && (
                      <span style={{ fontSize: 12, color: '#FCA5A5', fontStyle: 'italic' }}>⚠ Status not set yet</span>
                    )}
                  </div>
                  {sel.transportStatus === 'needs_driver' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <select value={sel.driverId ?? ''} onChange={e => assignDriver(sel.id, e.target.value)}
                        style={{ ...s.select, background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
                        <option value="">— Assign driver —</option>
                        {ADULTS.map(a => {
                          const rule = rules.find(r => r.id === sel.standingRuleId)
                          return <option key={a.id} value={a.id}>{a.name}{rule?.driverId === a.id ? ' (standing)' : ''}</option>
                        })}
                        <option value="__carpool__">Outside carpool</option>
                      </select>
                      <input type="text" placeholder="Carpool note (optional)" value={sel.carpoolNote ?? ''}
                        onChange={e => updateCarpoolNote(sel.id, e.target.value)}
                        style={{ border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 6, padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.07)', color: '#fff', width: 210, fontFamily: "'DM Sans',sans-serif" }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AGENDA */}
        <div style={s.card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0EDE8', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Meeting Agenda</span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="text" value={newAgenda} onChange={e => setNewAgenda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAgendaItem()} placeholder="Add an agenda item…"
                style={{ flex: 1, border: '1.5px solid #E8E3DB', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1A1A2E', fontFamily: "'DM Sans',sans-serif" }} />
              <button style={s.btnPri} onClick={addAgendaItem}><Plus size={14} /></button>
            </div>
            {agenda.length === 0
              ? <p style={{ fontSize: 13, color: '#C4B8A8', fontStyle: 'italic' }}>No items yet. Family members can add topics on their forms too.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {agenda.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F7F4EF', borderRadius: 8 }}>
                      <span style={{ fontSize: 13, color: '#C4522A', fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                      <span style={{ fontSize: 13, color: '#1A1A2E', flex: 1 }}>{item}</span>
                      <button style={s.btnGhost} onClick={() => setAgenda(a => a.filter((_, j) => j !== i))}><X size={13} /></button>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        {/* DEADLINE */}
        <div style={s.card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0EDE8', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={15} style={{ color: '#C4522A' }} />
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Form Deadline</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: '#4A4A5A', display: 'flex', alignItems: 'center', gap: 8 }}>
              Deadline:
              <select value={deadlineDay} onChange={e => setDeadlineDay(e.target.value as 'saturday' | 'sunday')} style={s.select}>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
              <input type="time" value={deadline} onChange={e => setDeadline(e.target.value)}
                style={{ border: '1.5px solid #E8E3DB', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: "'DM Sans',sans-serif" }} />
            </label>
            <span style={{ fontSize: 12, color: '#8B8599' }}>Kids who haven't submitted get a reminder text. You'll be notified too.</span>
          </div>
        </div>

        {/* MARK AS READY */}
        {isReady ? (
          <div style={{ background: 'linear-gradient(135deg,#1A1A2E,#2D2D4A)', borderRadius: 12, padding: 24, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle size={26} style={{ color: '#4ADE80', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>Ready to go</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  Forms go out Sunday at 8:00 AM · Deadline: {deadlineDay === 'sunday' ? 'Sun' : 'Sat'} at {deadline}
                </div>
              </div>
            </div>
            <button onClick={() => setIsReady(false)}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'DM Sans',sans-serif" }}>
              <Undo2 size={14} /> Undo — back to editing
            </button>
          </div>
        ) : (
          <div style={{ ...s.card, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 3 }}>Ready to schedule?</div>
              <div style={{ fontSize: 13, color: '#8B8599' }}>
                Forms go out Sunday at 8:00 AM. You can undo anytime before then.&nbsp;
                {gaps.length > 0 && <span style={{ color: '#D97706' }}>{gaps.length} transport gap{gaps.length > 1 ? 's' : ''} still open.&nbsp;</span>}
                {unset.length > 0 && <span style={{ color: '#EF4444' }}>{unset.length} event{unset.length > 1 ? 's' : ''} with no transport status.&nbsp;</span>}
                {events.length > 0 && gaps.length === 0 && unset.length === 0 && <span style={{ color: '#15803D' }}>All events accounted for ✓</span>}
              </div>
            </div>
            <button style={{ ...s.btnPri, padding: '12px 28px', fontSize: 15 }} onClick={() => setIsReady(true)}>
              <Send size={15} /> Mark as Ready
            </button>
          </div>
        )}

        {/* STANDING RULES */}
        <div style={s.card}>
          <button onClick={() => setRulesOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Car size={15} style={{ color: '#8B8599' }} />
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Standing Rules</span>
              <span style={{ fontSize: 11, background: '#F0EDE8', color: '#8B8599', padding: '2px 8px', borderRadius: 12 }}>{rules.length}</span>
            </div>
            {rulesOpen ? <ChevronUp size={15} color="#8B8599" /> : <ChevronDown size={15} color="#8B8599" />}
          </button>
          {rulesOpen && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F0EDE8' }}>
              <p style={{ fontSize: 12, color: '#8B8599', margin: '12px 0 14px' }}>
                These auto-apply every week. Override this week only without permanently changing the rule.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rules.map(rule => {
                  const driver = getMember(rule.driverId)
                  const ov = rule.overrideThisWeek
                  return (
                    <div key={rule.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: ov ? '#FEF2F2' : '#F0FDF4', borderRadius: 8, border: `1px solid ${ov ? '#FECACA' : '#BBF7D0'}`, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: driver?.color, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{driver?.name[0]}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: ov ? '#DC2626' : '#166534' }}>{rule.label}</span>
                        <span style={{ fontSize: 11, color: '#8B8599' }}>({rule.recurrence})</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ ...s.btnSec, fontSize: 12, padding: '4px 10px', border: `1.5px solid ${ov ? '#FECACA' : '#DDD8CF'}`, color: ov ? '#DC2626' : '#6B7280' }}
                          onClick={() => toggleRuleOverride(rule.id)}>
                          {ov ? '↩ Restore' : 'Override this week'}
                        </button>
                        <button style={s.btnGhost} onClick={() => setRules(r => r.filter(x => x.id !== rule.id))}><X size={13} /></button>
                      </div>
                    </div>
                  )
                })}
                {rules.length === 0 && <p style={{ fontSize: 13, color: '#C4B8A8', fontStyle: 'italic' }}>No standing rules yet.</p>}
              </div>
              {addRuleOpen ? (
                <div style={{ marginTop: 12, padding: 14, background: '#F7F4EF', borderRadius: 8, border: '1px solid #E8E3DB', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>New Standing Rule</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select value={newRule.driverId} onChange={e => setNewRule(r => ({ ...r, driverId: e.target.value }))} style={s.select}>
                      <option value="">Driver…</option>
                      {ADULTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <span style={{ fontSize: 12, color: '#8B8599' }}>drives</span>
                    <select value={newRule.passengerId} onChange={e => setNewRule(r => ({ ...r, passengerId: e.target.value }))} style={s.select}>
                      <option value="">Passenger…</option>
                      {KIDS.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                    <input type="text" placeholder="When? (e.g. Every Tuesday)" value={newRule.recurrence}
                      onChange={e => setNewRule(r => ({ ...r, recurrence: e.target.value }))}
                      style={{ border: '1.5px solid #E8E3DB', borderRadius: 6, padding: '5px 10px', fontSize: 13, flex: 1, minWidth: 160, fontFamily: "'DM Sans',sans-serif" }} />
                    <button style={{ ...s.btnPri, padding: '7px 14px' }} onClick={addRule}>Add</button>
                    <button style={{ ...s.btnSec, padding: '7px 12px' }} onClick={() => setAddRuleOpen(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button style={{ ...s.btnSec, marginTop: 12, fontSize: 12 }} onClick={() => setAddRuleOpen(true)}>
                  <Plus size={12} /> Add standing rule
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
