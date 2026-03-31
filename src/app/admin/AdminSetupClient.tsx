'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import {
  Calendar, RefreshCw, Plus, X, CheckCircle, AlertTriangle,
  Clock, ChevronDown, ChevronUp, Undo2, Send, Loader2, LogOut
} from 'lucide-react'
import type { CalendarEvent, DinnerEntry } from '@/lib/types'
import { FAMILY_MEMBERS } from '@/lib/family'

// ─── Week display helpers ─────────────────────────────────────
const WEEK_LABELS = [
  { label: 'Sunday',    short: 'Sun' },
  { label: 'Monday',    short: 'Mon' },
  { label: 'Tuesday',   short: 'Tue' },
  { label: 'Wednesday', short: 'Wed' },
  { label: 'Thursday',  short: 'Thu' },
  { label: 'Friday',    short: 'Fri' },
  { label: 'Saturday',  short: 'Sat' },
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

// ─── School kids who attend school Mon–Fri ───────────────────
const SCHOOL_KIDS = ['boston', 'hailee', 'sadie']
const SCHOOL_DAYS = [1, 2, 3, 4, 5] // Mon=1 … Fri=5 (matches dayIdx with Sun=0)

const DEFAULT_SCHOOL = {
  dropoffTime: '7:30 AM',
  pickupTime:  '3:00 PM',
  dropoffDriverId: '',
  pickupDriverId:  '',
  noSchool: [] as number[], // dayIdx values where school is cancelled
}

// ─── Test Links Panel ─────────────────────────────────────────
function TestLinksPanel({ weekStartKey }: { weekStartKey: string | null }) {
  const [open,       setOpen]       = useState(false)
  const [status,     setStatus]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [emailStatus,setEmailStatus]= useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [links,      setLinks]      = useState<Array<{ name: string; type: string; url: string }>>([])
  const [emailResult,setEmailResult]= useState<{ sent: string[]; failed: string[] } | null>(null)
  const [errMsg,     setErrMsg]     = useState('')
  const [copied,     setCopied]     = useState<string | null>(null)

  const generate = async () => {
    if (!weekStartKey) return
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/generate-test-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStartKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setLinks(data.links ?? [])
      setStatus('done')
    } catch (e: any) {
      setErrMsg(e.message)
      setStatus('error')
    }
  }

  const sendEmails = async () => {
    if (!weekStartKey) return
    setEmailStatus('sending')
    try {
      const res = await fetch('/api/send-form-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStartKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmailResult({ sent: data.sent ?? [], failed: data.failed ?? [] })
      setEmailStatus('sent')
    } catch {
      setEmailStatus('error')
    }
  }

  const copyLink = (url: string, name: string) => {
    navigator.clipboard.writeText(url)
    setCopied(name)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E3DB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🔗</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Send Form Links</span>
          {emailStatus === 'sent' && <span style={{ fontSize: 11, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Emails sent ✓</span>}
        </div>
        {open ? <ChevronUp size={15} color="#8B8599" /> : <ChevronDown size={15} color="#8B8599" />}
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F0EDE8' }}>
          <p style={{ fontSize: 13, color: '#8B8599', margin: '12px 0 14px', lineHeight: 1.5 }}>
            Send each family member their unique form link via email. Or generate links to share manually.
          </p>

          {/* Email send button — primary action */}
          <div style={{ marginBottom: 14 }}>
            {emailStatus === 'idle' || emailStatus === 'error' ? (
              <button onClick={sendEmails} disabled={!weekStartKey}
                style={{ width: '100%', background: '#C4522A', color: '#fff', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: weekStartKey ? 1 : 0.5 }}>
                ✉ Email Form Links to Everyone
              </button>
            ) : emailStatus === 'sending' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8B8599', padding: '10px 0' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending emails…
              </div>
            ) : (
              <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', fontSize: 13 }}>
                <div style={{ color: '#15803D', fontWeight: 600, marginBottom: emailResult?.failed.length ? 4 : 0 }}>
                  ✓ Emails sent to {emailResult?.sent.length} people: {emailResult?.sent.join(', ')}
                </div>
                {emailResult?.failed && emailResult.failed.length > 0 && (
                  <div style={{ color: '#DC2626', fontSize: 12, marginTop: 3 }}>
                    Failed: {emailResult.failed.join(', ')}
                  </div>
                )}
              </div>
            )}
            {emailStatus === 'error' && (
              <p style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>Failed to send emails. Check Gmail API scope — sign out and back in.</p>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: '#F0EDE8' }} />
            <span style={{ fontSize: 11, color: '#8B8599' }}>or get links manually</span>
            <div style={{ flex: 1, height: 1, background: '#F0EDE8' }} />
          </div>

          {status === 'idle' && (
            <button onClick={generate} disabled={!weekStartKey}
              style={{ background: '#F7F4EF', color: '#4A4A5A', border: '1.5px solid #E2DDD6', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 7, opacity: weekStartKey ? 1 : 0.5 }}>
              <Plus size={13} /> Generate Links
            </button>
          )}
          {status === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8B8599' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…
            </div>
          )}
          {status === 'error' && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA', fontSize: 13, color: '#DC2626' }}>
              ⚠ {errMsg}
              <button onClick={generate} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Retry</button>
            </div>
          )}
          {status === 'done' && links.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['adult', 'kid'] as const).map(type => {
                const group = links.filter(l => l.type === type)
                if (!group.length) return null
                return (
                  <div key={type}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#8B8599', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      {type === 'adult' ? '👩 Adults' : '🧒 Kids'}
                    </div>
                    {group.map(link => (
                      <div key={link.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#F7F4EF', borderRadius: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', minWidth: 70 }}>{link.name}</span>
                        <span style={{ fontSize: 11, color: '#8B8599', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</span>
                        <a href={link.url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 600, textDecoration: 'none', padding: '4px 8px', background: '#EFF6FF', borderRadius: 5, whiteSpace: 'nowrap' }}>
                          Open ↗
                        </a>
                        <button onClick={() => copyLink(link.url, link.name)}
                          style={{ fontSize: 12, color: copied === link.name ? '#15803D' : '#8B8599', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
                          {copied === link.name ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
              <button onClick={generate} style={{ fontSize: 12, color: '#8B8599', background: 'none', border: '1px solid #DDD8CF', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", alignSelf: 'flex-start' }}>
                ↺ Regenerate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Preview Plan ─────────────────────────────────────────────
function PreviewPlan({ events, dinner, agenda, weekLabel, members }: any) {
  const [open, setOpen] = useState(false)
  const WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#F7F4EF', border: '1.5px solid #E2DDD6', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#4A4A5A', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
        👁 Preview Plan
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, overflowY: 'auto', padding: '24px 16px' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: '#1A1A2E', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: '#7070A0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Draft Preview</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>{weekLabel}</div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Schedule */}
              {WEEK.map((day, dayIdx) => {
                const dayEvts = events.filter((e: any) => e.dayIdx === dayIdx && e.transportStatus !== 'unset')
                const din     = dinner.find((d: any) => d.dayIdx === dayIdx) ?? { meal: '', cook: '' }
                if (!dayEvts.length && !din.meal) return null
                return (
                  <div key={day}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #E8E3DB' }}>{day}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dayEvts.map((evt: any) => {
                        const driver = members.find((m: any) => m.id === evt.driverId)
                        return (
                          <div key={evt.id} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#FAFAF7', borderRadius: 8, border: '1px solid #EDE8E0', borderLeft: `3px solid ${evt.transportStatus === 'needs_driver' ? '#C4522A' : '#E2DDD6'}` }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{evt.title}</div>
                              <div style={{ fontSize: 12, color: '#8B8599' }}>{evt.time}</div>
                            </div>
                            {driver && (
                              <div style={{ fontSize: 12, color: '#C4522A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                🚗 {driver.name}
                              </div>
                            )}
                            {evt.transportStatus === 'needs_driver' && !driver && (
                              <div style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>⚠ No driver</div>
                            )}
                          </div>
                        )
                      })}
                      {din.meal && (
                        <div style={{ padding: '8px 12px', background: '#FFFBF5', borderRadius: 8, border: '1px solid #FDE8CC', borderLeft: '3px solid #F59E0B', fontSize: 13 }}>
                          🍽 {din.meal}{din.cook ? ` · ${din.cook} cooking` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Agenda */}
              {agenda.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #E8E3DB' }}>Meeting Agenda</div>
                  {agenda.map((item: string, i: number) => (
                    <div key={i} style={{ padding: '7px 12px', background: '#F7F4EF', borderRadius: 7, marginBottom: 5, fontSize: 13, color: '#1A1A2E' }}>
                      <strong style={{ color: '#C4522A' }}>{i+1}.</strong> {item}
                    </div>
                  ))}
                </div>
              )}

              {/* Transport gaps */}
              {events.filter((e: any) => e.transportStatus === 'needs_driver' && !e.driverId).length > 0 && (
                <div style={{ padding: '12px 16px', background: '#FFFBEB', borderRadius: 9, border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>⚠ Still needs drivers:</div>
                  {events.filter((e: any) => e.transportStatus === 'needs_driver' && !e.driverId).map((e: any) => (
                    <div key={e.id} style={{ fontSize: 12, color: '#B45309', marginBottom: 2 }}>• {e.title} ({WEEK[e.dayIdx]} {e.time})</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── School Schedule sub-component ───────────────────────────
function SchoolSchedule({ events, setEvents, weekDates, adults, s }: any) {
  const [open,   setOpen]   = useState(false)
  const [config, setConfig] = useState(DEFAULT_SCHOOL)

  const WEEK_DAYS_LABEL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const applyToCalendar = () => {
    // Remove any existing school events first
    const withoutSchool = events.filter((e: any) => !e.id.startsWith('school_'))

    const schoolEvents: any[] = []
    SCHOOL_DAYS.forEach(dayIdx => {
      if (config.noSchool.includes(dayIdx)) return
      const dateLabel = weekDates[dayIdx] ?? ''
      // Drop-off
      schoolEvents.push({
        id: `school_drop_${dayIdx}`,
        title: `School Drop-off (Boston, Hailee, Sadie)`,
        dayIdx,
        time: config.dropoffTime,
        sortMin: parseTimeToMin(config.dropoffTime),
        location: 'School',
        allDay: false,
        involvedIds: SCHOOL_KIDS,
        transportStatus: 'needs_driver',
        driverId: config.dropoffDriverId || null,
        standingRuleId: null,
        carpoolNote: '',
      })
      // Pick-up
      schoolEvents.push({
        id: `school_pickup_${dayIdx}`,
        title: `School Pick-up (Boston, Hailee, Sadie)`,
        dayIdx,
        time: config.pickupTime,
        sortMin: parseTimeToMin(config.pickupTime),
        location: 'School',
        allDay: false,
        involvedIds: SCHOOL_KIDS,
        transportStatus: 'needs_driver',
        driverId: config.pickupDriverId || null,
        standingRuleId: null,
        carpoolNote: '',
      })
    })

    setEvents([...withoutSchool, ...schoolEvents])
  }

  const toggleNoSchool = (dayIdx: number) => {
    setConfig(c => ({
      ...c,
      noSchool: c.noSchool.includes(dayIdx)
        ? c.noSchool.filter(d => d !== dayIdx)
        : [...c.noSchool, dayIdx]
    }))
  }

  const schoolEventsInCalendar = events.filter((e: any) => e.id.startsWith('school_')).length

  return (
    <div style={s.card}>
      <button onClick={() => setOpen((o: boolean) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🏫</span>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>School Schedule</span>
          {schoolEventsInCalendar > 0
            ? <span style={{ fontSize: 11, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Added to calendar ✓</span>
            : <span style={{ fontSize: 11, background: '#F0EDE8', color: '#8B8599', padding: '2px 8px', borderRadius: 10 }}>Boston · Hailee · Sadie</span>
          }
        </div>
        {open ? <ChevronUp size={15} color="#8B8599" /> : <ChevronDown size={15} color="#8B8599" />}
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F0EDE8' }}>
          <p style={{ fontSize: 13, color: '#8B8599', margin: '12px 0 16px', lineHeight: 1.5 }}>
            Boston, Hailee, and Sadie have school Monday–Friday. Set the times and default drivers, then apply to the calendar.
          </p>

          {/* Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8B8599', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Drop-off time</div>
              <input type="text" value={config.dropoffTime}
                onChange={e => setConfig(c => ({ ...c, dropoffTime: e.target.value }))}
                style={{ ...s.field, fontSize: 13, padding: '8px 10px' }} placeholder="e.g. 7:30 AM" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8B8599', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Pick-up time</div>
              <input type="text" value={config.pickupTime}
                onChange={e => setConfig(c => ({ ...c, pickupTime: e.target.value }))}
                style={{ ...s.field, fontSize: 13, padding: '8px 10px' }} placeholder="e.g. 3:00 PM" />
            </div>
          </div>

          {/* Default drivers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8B8599', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Default drop-off driver</div>
              <select value={config.dropoffDriverId} onChange={e => setConfig(c => ({ ...c, dropoffDriverId: e.target.value }))} style={{ ...s.select, width: '100%' }}>
                <option value="">— Set per day in calendar —</option>
                {adults.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8B8599', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Default pick-up driver</div>
              <select value={config.pickupDriverId} onChange={e => setConfig(c => ({ ...c, pickupDriverId: e.target.value }))} style={{ ...s.select, width: '100%' }}>
                <option value="">— Set per day in calendar —</option>
                {adults.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* No school days */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8B8599', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>No school this week?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {SCHOOL_DAYS.map(dayIdx => {
                const off = config.noSchool.includes(dayIdx)
                return (
                  <button key={dayIdx} onClick={() => toggleNoSchool(dayIdx)}
                    style={{ padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: off ? 700 : 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", border: `1.5px solid ${off ? '#FECACA' : '#E2DDD6'}`, background: off ? '#FEF2F2' : '#fff', color: off ? '#DC2626' : '#4A4A5A', transition: 'all 0.12s' }}>
                    {off ? '✗ ' : ''}{WEEK_DAYS_LABEL[dayIdx]}
                  </button>
                )
              })}
            </div>
          </div>

          <button onClick={applyToCalendar}
            style={{ ...s.btnPri, width: '100%', justifyContent: 'center', padding: '11px' }}>
            {schoolEventsInCalendar > 0 ? '↺ Update School Events in Calendar' : '+ Add School Events to Calendar'}
          </button>
        </div>
      )}
    </div>
  )
}

function parseTimeToMin(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 0
  let hours = parseInt(match[1])
  const mins = parseInt(match[2])
  const period = match[3].toUpperCase()
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return hours * 60 + mins
}

// ─── Send Forms Button ────────────────────────────────────────
function SendFormsButton({ weekStartKey }: { weekStartKey: string | null }) {
  const [status,  setStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [results, setResults] = useState<{ sent: string[]; failed: string[] } | null>(null)
  const [errMsg,  setErrMsg]  = useState('')

  const handleSend = async () => {
    if (!weekStartKey) return
    setStatus('sending')
    setErrMsg('')
    try {
      const res = await fetch('/api/send-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStartKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)
      setResults({ sent: data.sent ?? [], failed: data.failed ?? [] })
      setStatus('sent')
    } catch (e: any) {
      setErrMsg(e.message ?? 'Unknown error')
      setStatus('error')
    }
  }

  if (status === 'sent' && results) return (
    <div style={{ padding: '12px 16px', background: 'rgba(74,222,128,0.1)', borderRadius: 8, border: '1px solid rgba(74,222,128,0.3)' }}>
      <div style={{ fontSize: 13, color: '#4ADE80', fontWeight: 600, marginBottom: results.failed.length ? 4 : 0 }}>
        ✓ Forms sent to {results.sent.length} {results.sent.length === 1 ? 'person' : 'people'}
        {results.sent.length > 0 && <span style={{ fontWeight: 400, opacity: 0.7 }}> — {results.sent.join(', ')}</span>}
      </div>
      {results.failed.length > 0 && (
        <div style={{ fontSize: 12, color: '#FCA5A5', marginTop: 4 }}>
          ⚠ Failed: {results.failed.join(', ')} — check phone numbers in the Family sheet
        </div>
      )}
    </div>
  )

  return (
    <div>
      <button onClick={handleSend} disabled={status === 'sending' || !weekStartKey}
        style={{ width: '100%', background: '#C4522A', color: '#fff', border: 'none', borderRadius: 9, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!weekStartKey || status === 'sending') ? 0.6 : 1 }}>
        {status === 'sending'
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending texts…</>
          : <><Send size={16} /> Send Forms to Family Now</>
        }
      </button>
      {status === 'error' && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.15)', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#FCA5A5' }}>
          ⚠ {errMsg || 'Failed to send. Check Twilio credentials in Vercel settings.'}
          <button onClick={handleSend} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Try again</button>
        </div>
      )}
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8, textAlign: 'center' }}>
        Each person gets a text with their unique form link.
      </p>
    </div>
  )
}

// ─── Reminder Button ──────────────────────────────────────────
function ReminderButton({ weekStartKey }: { weekStartKey: string | null }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [result, setResult] = useState<{ reminded: string[]; notSubmitted: string[] } | null>(null)

  const handleRemind = async () => {
    if (!weekStartKey) return
    setStatus('sending')
    try {
      const res = await fetch('/api/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStartKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ reminded: data.reminded ?? [], notSubmitted: data.notSubmitted ?? [] })
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent' && result) return (
    <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
      {result.notSubmitted.length === 0
        ? '✓ Everyone has submitted — no reminders needed!'
        : `✓ Reminder sent to: ${result.reminded.join(', ') || 'none'}`
      }
    </div>
  )

  return (
    <button onClick={handleRemind} disabled={status === 'sending' || !weekStartKey}
      style={{ width: '100%', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 9, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {status === 'sending'
        ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending reminders…</>
        : <><AlertTriangle size={14} /> Send Deadline Reminders</>
      }
    </button>
  )
}

// ─── Mid-Week Update Button ───────────────────────────────────
function MidWeekUpdateButton({ weekStartKey, events, dinner, agenda, weekLabel, members }: any) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  const handleUpdate = async () => {
    if (!weekStartKey) return
    setStatus('sending')
    try {
      const schedule = WEEK.map((day: string) => {
        const dayIdx = WEEK.indexOf(day)
        const dayEvents = events
          .filter((e: any) => e.dayIdx === dayIdx && e.transportStatus !== 'unset')
          .map((e: any) => ({
            title: e.title, time: e.time, location: e.location ?? '',
            driver: members.find((m: any) => m.id === e.driverId)?.name ?? '',
          }))
        return { day, events: dayEvents }
      })
      const dinnerGrid = WEEK.map((day: string, i: number) => {
        const slot = dinner.find((d: any) => d.dayIdx === i) ?? { meal: '', cook: '' }
        return { day, meal: slot.meal, cook: slot.cook }
      })
      const plan = { weekLabel, weekStart: weekStartKey, schedule, dinner: dinnerGrid, agenda, shopping: [], confirmedAt: new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) }
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStartKey, plan }),
      })
      if (!res.ok) throw new Error('Update failed')
      setStatus('sent')
      setTimeout(() => setStatus('idle'), 4000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <button onClick={handleUpdate} disabled={status === 'sending' || !weekStartKey}
      style={{ width: '100%', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 9, padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {status === 'sending' && <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending update…</>}
      {status === 'sent'    && <>✓ Mid-week update sent!</>}
      {status === 'error'   && <>⚠ Update failed — try again</>}
      {status === 'idle'    && <><RefreshCw size={13} /> Send Mid-Week Update to Family</>}
    </button>
  )
}

export default function AdminSetupClient() {
  const [events,      setEvents]      = useState<CalendarEvent[]>([])
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
  const [weekOffset,  setWeekOffset]  = useState(0)
  const [futureOpen,  setFutureOpen]  = useState(false)
  const [syncError,   setSyncError]   = useState<string | null>(null)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [saveStatus,  setSaveStatus]  = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [weekStartKey,setWeekStartKey]= useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Family members — start with family.ts, upgrade from Sheet ──
  const [familyMembers, setFamilyMembers] = useState<any[]>(FAMILY_MEMBERS)
  const ADULTS     = familyMembers.filter(m => m.type === 'adult')
  const KIDS       = familyMembers.filter(m => m.type === 'child')
  const getMember  = (id: string) => familyMembers.find(m => m.id === id)

  useEffect(() => {
    fetch('/api/family')
      .then(r => r.json())
      .then(data => {
        if (data.members?.length > 0) setFamilyMembers(data.members)
      })
      .catch(() => {}) // silently fail — family.ts data stays in place
  }, [])

  // ─── Build state snapshot for saving ─────────────────────────
  const getSnapshot = useCallback(() => ({
    events, dinner, agenda, deadline, deadlineDay, isReady
  }), [events, dinner, agenda, deadline, deadlineDay, isReady])

  // ─── Save to Google Sheets (debounced 2s) ────────────────────
  const saveState = useCallback(async (weekStart: string, snapshot: object) => {
    if (!weekStart) return
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, state: snapshot }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }, [])

  const triggerSave = useCallback((weekStart: string, snapshot: object) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveState(weekStart, snapshot), 2000)
  }, [saveState])

  // ─── Auto-save when key state changes ────────────────────────
  useEffect(() => {
    if (weekStartKey && events.length > 0) {
      triggerSave(weekStartKey, getSnapshot())
    }
  }, [events, dinner, agenda, deadline, deadlineDay, isReady])

  // ─── Load saved state for a given weekStart ───────────────────
  const loadState = useCallback(async (weekStart: string) => {
    try {
      const res = await fetch(`/api/admin-state?weekStart=${weekStart}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.found) return
      const saved = data.state
      if (saved.events?.length)        setEvents(saved.events)
      if (saved.dinner)                setDinner(saved.dinner)
      if (saved.agenda)                setAgenda(saved.agenda)
      if (saved.deadline)              setDeadline(saved.deadline)
      if (saved.deadlineDay)           setDeadlineDay(saved.deadlineDay)
      if (saved.isReady !== undefined) setIsReady(saved.isReady)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      // No saved state yet — that's fine
    }
  }, [])

  // ─── Sync with Google Calendar ──────────────────────────────
  const handleSync = useCallback(async (offset: number = weekOffset) => {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch(`/api/calendar?weekOffset=${offset}`)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data = await res.json()

      // Merge incoming events with existing assignments
      // so that transport/driver/people data is preserved on re-sync
      setEvents(prev => {
        const incoming = data.events as CalendarEvent[]
        return incoming.map(evt => {
          // Find a matching existing event by id or by title+dayIdx
          const existing = prev.find(e => e.id === evt.id) ??
                           prev.find(e => e.title === evt.title && e.dayIdx === evt.dayIdx)

          // Apply standing rules if no existing assignment
          const matchingRule = null

          if (existing && (
            existing.involvedIds.length > 0 ||
            existing.transportStatus !== 'unset' ||
            existing.driverId
          )) {
            // Preserve all admin-set fields, just update time/location from calendar
            return {
              ...existing,
              id:       evt.id,
              time:     evt.time,
              sortMin:  evt.sortMin,
              location: evt.location,
              allDay:   evt.allDay,
            }
          }

          // New event — apply standing rule if applicable
          if (matchingRule) {
            return {
              ...evt,
              transportStatus: 'needs_driver' as const,
              driverId:        matchingRule.driverId,
              standingRuleId:  matchingRule.id,
            }
          }

          return evt
        })
      })

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
        const offsetLabel = offset === 0 ? 'This Week' : offset === 1 ? 'Next Week' : `In ${offset} Weeks`
        setWeekLabel(`${offsetLabel} · ${dates[0]}`)

        // Set the week key and try to load saved state
        const weekStartStr = data.weekStart as string
        setWeekStartKey(weekStartStr)
        await loadState(weekStartStr)
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [weekOffset, loadState])

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
            {saveStatus === 'saving' && <span style={{ fontSize: 12, color: '#7070A0' }}>Saving…</span>}
            {saveStatus === 'saved'  && <span style={{ fontSize: 12, color: '#4ADE80' }}>✓ Saved</span>}
            {saveStatus === 'error'  && <span style={{ fontSize: 12, color: '#FCA5A5' }}>⚠ Save failed</span>}
            {lastSynced && <span style={{ fontSize: 12, color: '#7070A0' }}>Synced: {lastSynced}</span>}
            <button onClick={() => handleSync(weekOffset)} disabled={syncing}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans',sans-serif" }}>
              {syncing
                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <RefreshCw size={13} />
              }
              {syncing ? 'Syncing…' : events.length === 0 ? 'Load Calendar' : 'Re-sync Calendar'}
            </button>
            <button onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              title="Sign out"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '9px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans',sans-serif" }}>
              <LogOut size={13} />
              Sign out
            </button>
          </div>
          {/* Preview Plan inline below header buttons */}
          {events.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <PreviewPlan events={events} dinner={dinner} agenda={agenda} weekLabel={weekLabel} members={familyMembers} />
            </div>
          )}
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
            <button style={{ ...s.btnPri }} onClick={() => handleSync(weekOffset)}>
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
                                  {evt.transportStatus === 'no_transport'
                                    ? <span style={{ fontSize: 9, color: '#15803D', fontWeight: 600 }}>✓ No transport</span>
                                    : evt.involvedIds.length === 0
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
                  {familyMembers.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                      Loading family members…
                    </div>
                  ) : (
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
                  )}
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
                        style={{ ...s.select, background: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', color: '#1A1A2E' }}>
                        <option value="">— Assign driver —</option>
                        {ADULTS.map(a => (
                          <option key={a.id} value={a.id} style={{ color: '#1A1A2E', background: '#fff' }}>{a.name}</option>
                        ))}
                        <option value="__carpool__" style={{ color: '#1A1A2E', background: '#fff' }}>Outside carpool</option>
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

        {/* MARK AS READY + SEND FORMS */}
        {isReady ? (
          <div style={{ background: 'linear-gradient(135deg,#1A1A2E,#2D2D4A)', borderRadius: 12, padding: 24, color: '#fff', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle size={26} style={{ color: '#4ADE80', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>Ready to go</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                    Deadline: {deadlineDay === 'sunday' ? 'Sun' : 'Sat'} at {deadline}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsReady(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'DM Sans',sans-serif" }}>
                <Undo2 size={14} /> Undo
              </button>
            </div>
            <SendFormsButton weekStartKey={weekStartKey} />
            <ReminderButton weekStartKey={weekStartKey} />
            <MidWeekUpdateButton weekStartKey={weekStartKey} events={events} dinner={dinner} agenda={agenda} weekLabel={weekLabel} members={familyMembers} />
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

        {/* ── TEST FORM LINKS ──────────────────────────────────── */}
        <TestLinksPanel weekStartKey={weekStartKey} />

        {/* ── SCHOOL SCHEDULE ──────────────────────────────────── */}
        <SchoolSchedule
          events={events}
          setEvents={setEvents}
          weekDates={weekDates}
          adults={ADULTS}
          s={s}
        />

        {/* ── PLAN AHEAD ────────────────────────────────────────── */}
        <div style={s.card}>
          <button onClick={() => setFutureOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Calendar size={15} style={{ color: '#8B8599' }} />
              <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Plan Ahead</span>
              {weekOffset > 0 && (
                <span style={{ fontSize: 11, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {weekOffset === 1 ? 'Viewing next week' : `Viewing +${weekOffset} weeks`}
                </span>
              )}
            </div>
            {futureOpen ? <ChevronUp size={15} color="#8B8599" /> : <ChevronDown size={15} color="#8B8599" />}
          </button>
          {futureOpen && (
            <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F0EDE8' }}>
              <p style={{ fontSize: 13, color: '#8B8599', margin: '12px 0 16px', lineHeight: 1.5 }}>
                Load a future week's calendar to plan ahead. Your current week's work is saved — switching weeks starts fresh.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'This Week',   offset: 0 },
                  { label: 'Next Week',   offset: 1 },
                  { label: 'In 2 Weeks',  offset: 2 },
                  { label: 'In 3 Weeks',  offset: 3 },
                ].map(opt => (
                  <button key={opt.offset}
                    onClick={() => {
                      setWeekOffset(opt.offset)
                      setEvents([])
                      setSelectedId(null)
                      handleSync(opt.offset)
                    }}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: weekOffset === opt.offset ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans',sans-serif",
                      border: `1.5px solid ${weekOffset === opt.offset ? '#1D4ED8' : '#DDD8CF'}`,
                      background: weekOffset === opt.offset ? '#EFF6FF' : '#fff',
                      color: weekOffset === opt.offset ? '#1D4ED8' : '#4A4A5A',
                      transition: 'all 0.12s',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {weekOffset > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', fontSize: 13, color: '#92400E' }}>
                  ⚠ You're viewing a future week. Forms will only go out for the current week's setup.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}