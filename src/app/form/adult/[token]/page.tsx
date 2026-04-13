'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, X, CheckCircle, MessageSquare, ChevronDown } from 'lucide-react'

const WEEK     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const TIMES    = ['Morning','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','Noon',
  '1:00 PM','2:00 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM',
  '5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','Evening','All Day']
const SCHOOL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday']

function emptyEvent() { return { id: Date.now(), what:'', day:'', time:'', where:'' } }

export default function AdultFormPage() {
  const params  = useParams()
  const token   = params?.token as string

  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [adultName,   setAdultName]   = useState('')
  const [weekLabel,   setWeekLabel]   = useState('')
  const [eventsByDay, setEventsByDay] = useState<Record<number, any[]>>({})
  const [driveMap,    setDriveMap]    = useState<Record<string, boolean>>({})
  const [schoolAvail, setSchoolAvail] = useState<Record<string, { am: boolean; pm: boolean }>>({})
  const [submitted,   setSubmitted]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [offEvents,   setOffEvents]   = useState<ReturnType<typeof emptyEvent>[]>([])
  const [topics,      setTopics]      = useState<string[]>([])
  const [newTopic,    setNewTopic]    = useState('')
  const [extrasOpen,  setExtrasOpen]  = useState(false)

  useEffect(() => {
    async function load() {
      if (!token) { setError('Invalid link'); setLoading(false); return }
      try {
        const res = await fetch(`/api/form/adult/${token}`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setAdultName(data.name)
        setWeekLabel(data.weekLabel)
        setEventsByDay(data.eventsByDay ?? {})

        const dm: Record<string, boolean> = {}
        for (const evts of Object.values(data.eventsByDay ?? {})) {
          for (const e of evts as any[]) {
            if (e.needsDriver) dm[e.id] = false
            // Pre-assigned drivers don't need a toggle
          }
        }
        setDriveMap(dm)

        const sa: Record<string, { am: boolean; pm: boolean }> = {}
        for (const day of SCHOOL_DAYS) {
          const def = data.schoolDefaults?.[day] ?? { am: false, pm: false }
          sa[day] = { am: def.am, pm: def.pm }
        }
        setSchoolAvail(sa)
      } catch {
        setError('This link is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const toggleDrive  = (id: string) => setDriveMap(m => ({ ...m, [id]: !m[id] }))
  const toggleSchool = (day: string, slot: 'am' | 'pm') =>
    setSchoolAvail(s => ({ ...s, [day]: { ...s[day], [slot]: !s[day]?.[slot] } }))

  const addOffEvent    = () => setOffEvents(e => [...e, emptyEvent()])
  const removeOffEvent = (id: number) => setOffEvents(e => e.filter(x => x.id !== id))
  const updateOffEvent = (id: number, field: string, val: string) =>
    setOffEvents(e => e.map(x => x.id === id ? { ...x, [field]: val } : x))

  const addTopic = () => {
    if (!newTopic.trim()) return
    setTopics(t => [...t, newTopic.trim()])
    setNewTopic('')
  }

  const submit = async () => {
    setSubmitting(true)
    const payload = { drivingResponses: driveMap, schoolAvailability: schoolAvail, offCalendarEvents: offEvents, meetingTopics: topics }
    try {
      await fetch('/api/submit/adult', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, payload }),
      })
    } catch (_) {}
    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ fontSize:14, color:'#8B8599' }}>Loading your form…</div>
    </div>
  )

  if (error) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF', padding:24 }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ textAlign:'center', maxWidth:320 }}>
        <div style={{ fontSize:40, marginBottom:16 }}>😕</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>Link not found</div>
        <p style={{ fontSize:14, color:'#8B8599' }}>{error}</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'#F0FDF4', border:'2px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <CheckCircle size={36} style={{ color:'#16A34A' }} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>Thanks, {adultName}!</div>
        <div style={{ fontSize:15, color:'#8B8599', lineHeight:1.6, marginBottom:20 }}>Your info is in. See you at the family meeting Sunday.</div>
        <div style={{ padding:'14px 20px', background:'white', borderRadius:12, border:'1px solid #E8E3DB', fontSize:13, color:'#8B8599' }}>📅 Family Meeting · This Sunday</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .card{background:#fff;border-radius:14px;border:1px solid #E8E3DB;box-shadow:0 1px 4px rgba(0,0,0,0.04);overflow:hidden}
        input,select{font-family:'DM Sans',sans-serif;outline:none}
        input:focus,select:focus{border-color:#C4522A!important}
        .field{width:100%;border:1.5px solid #E2DDD6;border-radius:8px;padding:10px 12px;font-size:14px;color:#1A1A2E;background:#fff}
        .field::placeholder{color:#C4B8A8}
        .btn-ghost{background:none;border:none;cursor:pointer;color:#C4B8A8;padding:4px;display:flex;align-items:center}
        .add-btn{display:flex;align-items:center;gap:6px;padding:9px 14px;border-radius:8px;background:#F7F4EF;border:1.5px dashed #D4CCC0;color:#8B8599;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;width:100%;justify-content:center}
      `}</style>

      <div style={{ background:'#1A1A2E', color:'#fff', padding:'24px 20px 28px' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', color:'#7070A0', textTransform:'uppercase', marginBottom:6 }}>Family Weekly Planning</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, marginBottom:4 }}>Hey {adultName}!</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)' }}>{weekLabel}</div>
        </div>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'20px 16px 48px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* 7-DAY GRID */}
        <div className="card">
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #F5F2EC' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#1A1A2E' }}>Your week</div>
            <div style={{ fontSize:12, color:'#8B8599', marginTop:3 }}>Tap 🏫 AM/PM to say you can do school runs. Tap event buttons to say you can drive.</div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(115px, 1fr))', minWidth:805 }}>
              {WEEK.map((day, dayIdx) => {
                const isSchoolDay = dayIdx >= 1 && dayIdx <= 5
                const dayEvts     = [...(eventsByDay[dayIdx] ?? [])].sort((a: any, b: any) => (a.sortMin ?? 0) - (b.sortMin ?? 0))
                const sa          = schoolAvail[day] ?? { am: false, pm: false }

                return (
                  <div key={dayIdx} style={{ borderRight: dayIdx < 6 ? '1px solid #F0EDE8' : 'none', display:'flex', flexDirection:'column' }}>
                    {/* Day header */}
                    <div style={{ padding:'8px 8px 6px', background:'#FAFAF7', borderBottom:'1px solid #F0EDE8', textAlign:'center' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#1A1A2E', textTransform:'uppercase', letterSpacing:'0.07em' }}>{day.slice(0,3)}</div>
                    </div>

                    {/* School AM/PM */}
                    {isSchoolDay && (
                      <div style={{ padding:'5px 5px', display:'flex', gap:3, borderBottom:'1px solid #F0EDE8', background:'#F8FBFF' }}>
                        {(['am','pm'] as const).map(slot => {
                          const active = sa[slot]
                          return (
                            <button key={slot} onClick={() => toggleSchool(day, slot)}
                              style={{ flex:1, padding:'5px 2px', borderRadius:5, fontSize:10, fontWeight:active?700:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'center',
                                background: active ? '#1D4ED8' : '#FEF2F2',
                                border: `1.5px solid ${active ? '#1D4ED8' : '#FECACA'}`,
                                color: active ? '#fff' : '#DC2626',
                              }}>
                              🏫 {slot.toUpperCase()}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Events */}
                    <div style={{ padding:'5px', flex:1, display:'flex', flexDirection:'column', gap:4, minHeight:90 }}>
                      {dayEvts.length === 0 && (
                        <div style={{ fontSize:9, color:'#C4B8A8', fontStyle:'italic', textAlign:'center', paddingTop:10 }}>Free</div>
                      )}
                      {dayEvts.map((evt: any) => {
                        const isSchool   = evt.id?.startsWith('school_')
                        const canDrive   = driveMap[evt.id] ?? false
                        const needsDrv   = evt.needsDriver
                        const amIDriver  = evt.amDriver === true

                        return (
                          <div key={evt.id} style={{ padding:'5px 6px', borderRadius:6, fontSize:10,
                            background: isSchool ? '#EFF6FF' : amIDriver ? '#F0FDF4' : needsDrv && canDrive ? '#F0FDF4' : needsDrv ? '#FFFBEB' : '#F7F4EF',
                            border: `1px solid ${isSchool ? '#BFDBFE' : amIDriver ? '#BBF7D0' : needsDrv && canDrive ? '#BBF7D0' : needsDrv ? '#FDE68A' : '#EDE8E0'}`,
                            borderLeft: `3px solid ${amIDriver ? '#16A34A' : isSchool ? '#1D4ED8' : '#E2DDD6'}`,
                          }}>
                            <div style={{ fontWeight:600, color:'#1A1A2E', lineHeight:1.3 }}>{evt.title}</div>
                            <div style={{ color:'#8B8599', marginBottom: (needsDrv || amIDriver) ? 4 : 0 }}>{evt.time}</div>
                            {amIDriver && (
                              <div style={{ fontSize:9, color:'#15803D', fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
                                🔒 You're driving this
                              </div>
                            )}
                            {needsDrv && (
                              <button onClick={() => toggleDrive(evt.id)}
                                style={{ width:'100%', padding:'3px', borderRadius:4, fontSize:9, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
                                  background: canDrive ? '#16A34A' : '#fff',
                                  border: `1.5px solid ${canDrive ? '#16A34A' : '#D1D5DB'}`,
                                  color: canDrive ? '#fff' : '#9CA3AF',
                                }}>
                                {canDrive ? '✓ I can drive' : 'Can drive? →'}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ padding:'8px 16px', background:'#FAFAF7', borderTop:'1px solid #F0EDE8', fontSize:11, color:'#8B8599' }}>
            School 🏫 AM = drop-off &nbsp;·&nbsp; PM = pick-up &nbsp;·&nbsp; Tap to toggle on/off
          </div>
        </div>

        {/* EXTRAS */}
        <div className="card">
          <button onClick={() => setExtrasOpen(o => !o)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'none', border:'none', cursor:'pointer' }}>
            <span style={{ fontSize:14, fontWeight:600, color:'#1A1A2E' }}>Anything else to add?</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {(offEvents.length > 0 || topics.length > 0) && (
                <span style={{ fontSize:11, background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', padding:'2px 7px', borderRadius:10, fontWeight:600 }}>
                  {offEvents.length + topics.length} added
                </span>
              )}
              <ChevronDown size={15} color="#8B8599" style={{ transform: extrasOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }} />
            </div>
          </button>

          {extrasOpen && (
            <div style={{ borderTop:'1px solid #F5F2EC', padding:'14px 18px', display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#8B8599', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Not on the calendar?</div>
                {offEvents.map((evt, i) => (
                  <div key={evt.id} style={{ padding:12, background:'#FAFAF7', borderRadius:10, border:'1px solid #EDE8E0', marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#C4522A', textTransform:'uppercase' }}>Event {i+1}</span>
                      <button className="btn-ghost" onClick={() => removeOffEvent(evt.id)}><X size={13} /></button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      <input className="field" type="text" placeholder="What is it?" value={evt.what} onChange={e => updateOffEvent(evt.id,'what',e.target.value)} />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                        <select className="field" value={evt.day} onChange={e => updateOffEvent(evt.id,'day',e.target.value)}>
                          <option value="">Day…</option>
                          {WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="field" value={evt.time} onChange={e => updateOffEvent(evt.id,'time',e.target.value)}>
                          <option value="">Time…</option>
                          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-btn" onClick={addOffEvent}><Plus size={13} /> Add an event</button>
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#8B8599', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
                  <MessageSquare size={11} style={{ display:'inline', marginRight:4 }} />Agenda topics
                </div>
                {topics.map((t, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'#F7F4EF', borderRadius:7, marginBottom:6 }}>
                    <span style={{ fontSize:13, color:'#1A1A2E', flex:1 }}>{t}</span>
                    <button className="btn-ghost" onClick={() => setTopics(ts => ts.filter((_,j) => j !== i))}><X size={12} /></button>
                  </div>
                ))}
                <div style={{ display:'flex', gap:8 }}>
                  <input className="field" type="text" placeholder="Add a topic…" value={newTopic}
                    onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key==='Enter' && addTopic()} />
                  <button onClick={addTopic} style={{ background:'#C4522A', color:'#fff', border:'none', borderRadius:8, padding:'0 14px', cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0 }}>
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button onClick={submit} disabled={submitting}
          style={{ width:'100%', background:'#1A1A2E', color:'#fff', border:'none', borderRadius:12, padding:'16px', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <CheckCircle size={18} /> {submitting ? 'Submitting…' : 'Submit my info'}
        </button>
      </div>
    </div>
  )
}
