'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, X, CheckCircle, MessageSquare, Car, AlertTriangle, Lock, ChevronDown } from 'lucide-react'

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const TIMES = ['Morning','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','Noon',
  '1:00 PM','2:00 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM',
  '5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','Evening','All Day']
const SCHOOL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday']
type SchoolSlot = 'am' | 'pm' | 'both' | 'neither' | null

function emptyEvent() { return { id: Date.now(), what:'', day:'', time:'', where:'' } }

export default function AdultFormPage() {
  const params = useParams()
  const token  = params?.token as string

  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [adultName,   setAdultName]   = useState('')
  const [weekLabel,   setWeekLabel]   = useState('')
  const [driveEvents, setDriveEvents] = useState<Array<{id:string;title:string;day:string;time:string;location:string;standingRule:boolean;canDrive:boolean|null}>>([])
  const [submitted,   setSubmitted]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [offEvents,   setOffEvents]   = useState<ReturnType<typeof emptyEvent>[]>([])
  const [topics,      setTopics]      = useState<string[]>([])
  const [newTopic,    setNewTopic]    = useState('')
  const [extrasOpen,  setExtrasOpen]  = useState(false)
  const [schoolAvail, setSchoolAvail] = useState<Record<string, SchoolSlot>>(
    Object.fromEntries(SCHOOL_DAYS.map(d => [d, null]))
  )

  useEffect(() => {
    async function load() {
      if (!token) { setError('Invalid link'); setLoading(false); return }
      try {
        const res = await fetch(`/api/form/adult/${token}`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setAdultName(data.name)
        setWeekLabel(data.weekLabel)
        setDriveEvents((data.driveEvents ?? []).map((e: any) => ({ ...e, canDrive: null })))
      } catch {
        setError('This link is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const setDriveResponse = (id: string, val: boolean) =>
    setDriveEvents(evs => evs.map(e => e.id === id ? { ...e, canDrive: e.canDrive === val ? null : val } : e))

  const addOffEvent    = () => setOffEvents(e => [...e, emptyEvent()])
  const removeOffEvent = (id: number) => setOffEvents(e => e.filter(x => x.id !== id))
  const updateOffEvent = (id: number, field: string, val: string) =>
    setOffEvents(e => e.map(x => x.id === id ? { ...x, [field]: val } : x))

  const addTopic = () => {
    if (!newTopic.trim()) return
    setTopics(t => [...t, newTopic.trim()])
    setNewTopic('')
  }

  const unanswered = driveEvents.filter(e => !e.standingRule && e.canDrive === null)

  const submit = async () => {
    setSubmitting(true)
    const drivingResponses: Record<string, boolean | null> = {}
    driveEvents.forEach(e => { drivingResponses[e.id] = e.canDrive })
    const payload = { drivingResponses, offCalendarEvents: offEvents, meetingTopics: topics, schoolAvailability: schoolAvail }
    try {
      await fetch('/api/submit/adult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, payload }),
      })
    } catch (_) {}
    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF' }}>
      <div style={{ fontSize:14, color:'#8B8599' }}>Loading…</div>
    </div>
  )

  if (error) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:320 }}>
        <div style={{ fontSize:40, marginBottom:16 }}>😕</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>Link not found</div>
        <p style={{ fontSize:14, color:'#8B8599' }}>{error}</p>
      </div>
    </div>
  )

  if (submitted) {
    const yesCount = driveEvents.filter(e => e.canDrive === true).length
    return (
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
        <div style={{ textAlign:'center', maxWidth:360 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'#F0FDF4', border:'2px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <CheckCircle size={36} style={{ color:'#16A34A' }} />
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>Thanks, {adultName}!</div>
          <div style={{ fontSize:15, color:'#8B8599', lineHeight:1.6, marginBottom:24 }}>Your availability has been submitted for the family meeting.</div>
          <div style={{ padding:'14px 20px', background:'white', borderRadius:12, border:'1px solid #E8E3DB', fontSize:13, color:'#8B8599' }}>
            📅 Family Meeting · This Sunday
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .card{background:#fff;border-radius:14px;border:1px solid #E8E3DB;box-shadow:0 1px 4px rgba(0,0,0,0.04);overflow:hidden}
        input,select{font-family:'DM Sans',sans-serif;outline:none;transition:border-color 0.12s}
        input:focus,select:focus{border-color:#C4522A!important;box-shadow:0 0 0 3px rgba(196,82,42,0.1)}
        .field{width:100%;border:1.5px solid #E2DDD6;border-radius:8px;padding:10px 12px;font-size:14px;color:#1A1A2E;background:#fff}
        .field::placeholder{color:#C4B8A8}
        .btn-ghost{background:none;border:none;cursor:pointer;color:#C4B8A8;padding:4px;display:flex;align-items:center}
        .add-btn{display:flex;align-items:center;gap:6px;padding:9px 14px;border-radius:8px;background:#F7F4EF;border:1.5px dashed #D4CCC0;color:#8B8599;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;width:100%;justify-content:center}
        .add-btn:hover{background:#F0EDE8;border-color:#C4B8A8;color:#4A4A5A}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.15s ease-out}
      `}</style>

      {/* Header */}
      <div style={{ background:'#1A1A2E', color:'#fff', padding:'24px 20px 28px' }}>
        <div style={{ maxWidth:480, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', color:'#7070A0', textTransform:'uppercase', marginBottom:6 }}>Family Weekly Planning</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, marginBottom:4 }}>Hey {adultName}!</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)' }}>{weekLabel}</div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'20px 16px 48px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* 1. DRIVING AVAILABILITY */}
        <div className="card">
          <div style={{ padding:'15px 18px', borderBottom:'1px solid #F5F2EC', display:'flex', alignItems:'center', gap:8 }}>
            <Car size={15} style={{ color:'#C4522A' }} />
            <span style={{ fontSize:15, fontWeight:700, color:'#1A1A2E' }}>Can you drive this week?</span>
            {driveEvents.length > 0 && unanswered.length === 0 && (
              <span style={{ marginLeft:'auto', fontSize:11, background:'#F0FDF4', color:'#16A34A', border:'1px solid #BBF7D0', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>All answered ✓</span>
            )}
          </div>
          <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
            {driveEvents.length === 0 && (
              <p style={{ fontSize:13, color:'#8B8599', fontStyle:'italic' }}>
                No unassigned events this week — nothing needed from you on driving.
              </p>
            )}
            {driveEvents.map(evt => {
              if (evt.standingRule) return (
                <div key={evt.id} style={{ padding:'12px 14px', background:'#F0FDF4', borderRadius:10, border:'1px solid #BBF7D0', display:'flex', alignItems:'flex-start', gap:10 }}>
                  <Lock size={13} style={{ color:'#16A34A', marginTop:2, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#166534' }}>{evt.title}</div>
                    <div style={{ fontSize:12, color:'#15803D', opacity:0.8, marginTop:1 }}>{evt.day} · {evt.time}</div>
                  </div>
                  <span style={{ fontSize:11, background:'#DCFCE7', color:'#166534', padding:'3px 8px', borderRadius:6, fontWeight:700, flexShrink:0 }}>You drive</span>
                </div>
              )
              const yes = evt.canDrive === true
              const no  = evt.canDrive === false
              return (
                <div key={evt.id} style={{ padding:14, background: yes?'#F0FDF4':no?'#FEF2F2':'#FAFAF7', borderRadius:10, border:`1.5px solid ${yes?'#BBF7D0':no?'#FECACA':'#EDE8E0'}`, transition:'all 0.15s' }}>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#1A1A2E' }}>{evt.title}</div>
                    <div style={{ fontSize:12, color:'#8B8599', marginTop:2 }}>{evt.day} · {evt.time}{evt.location ? ` · ${evt.location}` : ''}</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setDriveResponse(evt.id, true)}
                      style={{ flex:1, padding:'9px', borderRadius:8, border:`1.5px solid ${yes?'#86EFAC':'#E2DDD6'}`, background:yes?'#16A34A':'#fff', color:yes?'#fff':'#4A4A5A', fontSize:13, fontWeight:yes?700:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      ✓ Yes
                    </button>
                    <button onClick={() => setDriveResponse(evt.id, false)}
                      style={{ flex:1, padding:'9px', borderRadius:8, border:`1.5px solid ${no?'#FECACA':'#E2DDD6'}`, background:no?'#DC2626':'#fff', color:no?'#fff':'#4A4A5A', fontSize:13, fontWeight:no?700:500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                      ✗ No
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. SCHOOL DRIVING */}
        <div className="card">
          <div style={{ padding:'15px 18px', borderBottom:'1px solid #F5F2EC', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:15 }}>🏫</span>
            <span style={{ fontSize:15, fontWeight:700, color:'#1A1A2E' }}>School runs this week</span>
          </div>
          <div style={{ padding:'14px 18px' }}>
            <p style={{ fontSize:13, color:'#8B8599', marginBottom:14, lineHeight:1.5 }}>
              Which days can you do school drop-off (AM) or pick-up (PM)?
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {SCHOOL_DAYS.map(day => {
                const val = schoolAvail[day]
                return (
                  <div key={day} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'#1A1A2E', minWidth:88 }}>{day}</span>
                    <div style={{ display:'flex', gap:6, flex:1 }}>
                      {([
                        { v:'am'     as SchoolSlot, label:'AM'      },
                        { v:'pm'     as SchoolSlot, label:'PM'      },
                        { v:'both'   as SchoolSlot, label:'Both'    },
                        { v:'neither'as SchoolSlot, label:'Neither' },
                      ]).map(opt => {
                        const active = val === opt.v
                        return (
                          <button key={opt.v}
                            onClick={() => setSchoolAvail(s => ({ ...s, [day]: active ? null : opt.v }))}
                            style={{ flex:1, padding:'7px 4px', borderRadius:7, fontSize:12, fontWeight:active?700:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.12s', textAlign:'center',
                              background: active ? (opt.v==='neither'?'#FEF2F2':'#F0FDF4') : '#fff',
                              border: `1.5px solid ${active ? (opt.v==='neither'?'#FECACA':'#BBF7D0') : '#E2DDD6'}`,
                              color: active ? (opt.v==='neither'?'#DC2626':'#166534') : '#8B8599',
                            }}>
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 3. EXTRAS — collapsed by default */}
        <div className="card">
          <button onClick={() => setExtrasOpen(o => !o)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 18px', background:'none', border:'none', cursor:'pointer' }}>
            <span style={{ fontSize:14, fontWeight:600, color:'#1A1A2E' }}>Anything else to add?</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {(offEvents.length > 0 || topics.length > 0) && (
                <span style={{ fontSize:11, background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', padding:'2px 7px', borderRadius:10, fontWeight:600 }}>
                  {offEvents.length + topics.length} item{offEvents.length + topics.length !== 1 ? 's' : ''}
                </span>
              )}
              <ChevronDown size={15} color="#8B8599" style={{ transform: extrasOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }} />
            </div>
          </button>

          {extrasOpen && (
            <div style={{ borderTop:'1px solid #F5F2EC', padding:'14px 18px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Off-calendar events */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#8B8599', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
                  Not on the calendar?
                </div>
                <p style={{ fontSize:13, color:'#8B8599', marginBottom:10 }}>Work trips, appointments, anything the family should know.</p>
                {offEvents.map((evt, i) => (
                  <div key={evt.id} className="fade-in" style={{ padding:12, background:'#FAFAF7', borderRadius:10, border:'1px solid #EDE8E0', marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#C4522A', textTransform:'uppercase' }}>Event {i+1}</span>
                      <button className="btn-ghost" onClick={() => removeOffEvent(evt.id)}><X size={13} /></button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      <input className="field" type="text" placeholder="What is it?" value={evt.what} onChange={e => updateOffEvent(evt.id,'what',e.target.value)} />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                        <select className="field" value={evt.day} onChange={e => updateOffEvent(evt.id,'day',e.target.value)}>
                          <option value="">Day…</option>
                          {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
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

              {/* Meeting topics */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#8B8599', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
                  <MessageSquare size={11} style={{ display:'inline', marginRight:4 }} />
                  Agenda topics
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
                  <button onClick={addTopic}
                    style={{ background:'#C4522A', color:'#fff', border:'none', borderRadius:8, padding:'0 14px', cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0 }}>
                    <Plus size={15} />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Submit */}
        {unanswered.length > 0 && (
          <div style={{ padding:'10px 14px', background:'#FFFBEB', borderRadius:8, border:'1px solid #FDE68A', fontSize:13, color:'#92400E', display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={13} style={{ flexShrink:0 }} />
            {unanswered.length} driving question{unanswered.length>1?'s':''} still unanswered.
          </div>
        )}
        <button onClick={submit} disabled={submitting}
          style={{ width:'100%', background:'#1A1A2E', color:'#fff', border:'none', borderRadius:12, padding:'16px', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <CheckCircle size={18} /> {submitting ? 'Submitting…' : 'Submit my info'}
        </button>

      </div>
    </div>
  )
}
