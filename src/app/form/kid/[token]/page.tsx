'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, X, CheckCircle, ShoppingCart, MessageSquare, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const TIMES = ['Morning','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','Noon',
  '1:00 PM','2:00 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM',
  '5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','Evening','All Day']

function emptyEvent() { return { id: Date.now(), what:'', day:'', time:'', where:'', needsRide: null as boolean | null } }
function emptyItem()  { return { id: Date.now(), item:'', qty:'', why:'' } }

export default function KidFormPage() {
  const params = useParams()
  const token  = params?.token as string

  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [kidName,     setKidName]     = useState('')
  const [weekLabel,   setWeekLabel]   = useState('')
  const [calEvents,   setCalEvents]   = useState<Array<{title:string;day:string;time:string;isYours:boolean}>>([])
  const [submitted,   setSubmitted]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [allGood,     setAllGood]     = useState(false)
  const [calOpen,     setCalOpen]     = useState(false)
  const [offEvents,   setOffEvents]   = useState<ReturnType<typeof emptyEvent>[]>([])
  const [shopping,    setShopping]    = useState<ReturnType<typeof emptyItem>[]>([])
  const [topics,      setTopics]      = useState<string[]>([])
  const [newTopic,    setNewTopic]    = useState('')

  // Load token data
  useEffect(() => {
    async function load() {
      if (!token) { setError('Invalid link'); setLoading(false); return }
      try {
        const res = await fetch(`/api/form/kid/${token}`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setKidName(data.name)
        setWeekLabel(data.weekLabel)
        setCalEvents(data.calEvents ?? [])
      } catch (e) {
        setError('This link is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const addOffEvent  = () => setOffEvents(e => [...e, emptyEvent()])
  const removeOffEvent = (id: number) => setOffEvents(e => e.filter(x => x.id !== id))
  const updateOffEvent = (id: number, field: string, val: any) =>
    setOffEvents(e => e.map(x => x.id === id ? { ...x, [field]: val } : x))

  const addItem    = () => setShopping(s => [...s, emptyItem()])
  const removeItem = (id: number) => setShopping(s => s.filter(x => x.id !== id))
  const updateItem = (id: number, field: string, val: string) =>
    setShopping(s => s.map(x => x.id === id ? { ...x, [field]: val } : x))

  const addTopic = () => {
    if (!newTopic.trim()) return
    setTopics(t => [...t, newTopic.trim()])
    setNewTopic('')
  }

  const submit = async (isAllGood: boolean) => {
    setSubmitting(true)
    const payload = {
      allGood: isAllGood,
      offCalendarEvents: isAllGood ? [] : offEvents,
      shoppingItems: isAllGood ? [] : shopping,
      meetingTopics: isAllGood ? [] : topics,
    }
    try {
      await fetch('/api/submit/kid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, payload }),
      })
    } catch (_) { /* fail silently — UI still shows success */ }
    setAllGood(isAllGood)
    setSubmitted(true)
    setSubmitting(false)
  }

  // ── States ──────────────────────────────────────────────────
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

  if (submitted) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ textAlign:'center', maxWidth:340 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'#F0FDF4', border:'2px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <CheckCircle size={36} style={{ color:'#16A34A' }} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>
          You're all set{kidName ? `, ${kidName}` : ''}!
        </div>
        <div style={{ fontSize:15, color:'#8B8599', lineHeight:1.6, marginBottom:24 }}>
          {allGood ? "Got it — nothing extra from you this week." : "Your info has been submitted for the family meeting."}
        </div>
        <div style={{ padding:'14px 20px', background:'white', borderRadius:12, border:'1px solid #E8E3DB', fontSize:13, color:'#8B8599' }}>
          📅 See you at the family meeting this Sunday!
        </div>
      </div>
    </div>
  )

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
        .label{font-size:11px;font-weight:700;color:#8B8599;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:10px;display:flex;align-items:center;gap:6px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.15s ease-out}
      `}</style>

      {/* Header */}
      <div style={{ background:'#1A1A2E', color:'#fff', padding:'24px 20px 28px' }}>
        <div style={{ maxWidth:480, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', color:'#7070A0', textTransform:'uppercase', marginBottom:6 }}>Family Weekly Planning</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, marginBottom:4 }}>Hey {kidName}! 👋</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)' }}>{weekLabel}</div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'20px 16px 48px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* All good quick submit */}
        <div className="card" style={{ border:'1.5px solid #BBF7D0', background:'#F0FDF4' }}>
          <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#166534', marginBottom:2 }}>Nothing extra this week?</div>
              <div style={{ fontSize:13, color:'#15803D', opacity:0.8 }}>Submit in one tap</div>
            </div>
            <button onClick={() => submit(true)} disabled={submitting}
              style={{ background:'#16A34A', color:'#fff', border:'none', borderRadius:8, padding:'10px 18px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap' }}>
              ✓ All good this week
            </button>
          </div>
        </div>

        {/* Calendar */}
        {calEvents.length > 0 && (
          <div className="card">
            <button onClick={() => setCalOpen(o => !o)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 18px', background:'none', border:'none', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Calendar size={15} style={{ color:'#C4522A' }} />
                <span style={{ fontSize:14, fontWeight:600, color:'#1A1A2E' }}>What's on the calendar</span>
              </div>
              {calOpen ? <ChevronUp size={15} color="#8B8599" /> : <ChevronDown size={15} color="#8B8599" />}
            </button>
            {calOpen && (
              <div style={{ padding:'0 18px 16px', borderTop:'1px solid #F5F2EC' }}>
                <p style={{ fontSize:12, color:'#8B8599', margin:'10px 0 12px', fontStyle:'italic' }}>
                  Read-only — your events are highlighted.
                </p>
                {calEvents.map((evt, i) => (
                  <div key={i} style={{ padding:'9px 0', borderBottom:'1px solid #F5F2EC', display:'flex', gap:10 }}>
                    <div style={{ width:3, borderRadius:2, background: evt.isYours ? '#C4522A' : '#E2DDD6', alignSelf:'stretch', flexShrink:0, minHeight:28 }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight: evt.isYours ? 600 : 400, color:'#1A1A2E' }}>
                        {evt.title}
                        {evt.isYours && <span style={{ marginLeft:6, fontSize:10, background:'#FEF0EA', color:'#C4522A', padding:'1px 6px', borderRadius:4, fontWeight:700 }}>You</span>}
                      </div>
                      <div style={{ fontSize:12, color:'#8B8599', marginTop:1 }}>{evt.day} · {evt.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Off-calendar events */}
        <div className="card">
          <div style={{ padding:'15px 18px 0' }}>
            <div className="label"><Plus size={12} /> Anything not on the calendar?</div>
            <p style={{ fontSize:13, color:'#8B8599', marginBottom:14, lineHeight:1.5 }}>Plans with friends, school stuff, anything else going on.</p>
          </div>
          {offEvents.length === 0
            ? <div style={{ padding:'0 18px 16px' }}><button className="add-btn" onClick={addOffEvent}><Plus size={13} /> Add an event</button></div>
            : <div style={{ padding:'0 18px 14px', display:'flex', flexDirection:'column', gap:14 }}>
                {offEvents.map((evt, i) => (
                  <div key={evt.id} className="fade-in" style={{ padding:14, background:'#FAFAF7', borderRadius:10, border:'1px solid #EDE8E0' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#C4522A', textTransform:'uppercase', letterSpacing:'0.06em' }}>Event {i+1}</span>
                      <button className="btn-ghost" onClick={() => removeOffEvent(evt.id)}><X size={14} /></button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <input className="field" type="text" placeholder="What is it?"
                        value={evt.what} onChange={e => updateOffEvent(evt.id, 'what', e.target.value)} />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <select className="field" value={evt.day} onChange={e => updateOffEvent(evt.id, 'day', e.target.value)}>
                          <option value="">Day…</option>
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="field" value={evt.time} onChange={e => updateOffEvent(evt.id, 'time', e.target.value)}>
                          <option value="">Time…</option>
                          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <input className="field" type="text" placeholder="Where?"
                        value={evt.where} onChange={e => updateOffEvent(evt.id, 'where', e.target.value)} />
                      <div>
                        <div style={{ fontSize:12, color:'#8B8599', marginBottom:6 }}>Do you need a ride?</div>
                        <div style={{ display:'flex', gap:8 }}>
                          {[{val:true,label:'🚗 Yes, I need a ride'},{val:false,label:'✓ I\'m good'}].map(opt => (
                            <button key={String(opt.val)}
                              onClick={() => updateOffEvent(evt.id, 'needsRide', evt.needsRide === opt.val ? null : opt.val)}
                              style={{ flex:1, padding:'9px', borderRadius:8, fontSize:13, fontWeight: evt.needsRide === opt.val ? 700 : 500, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.12s', border:`1.5px solid ${evt.needsRide === opt.val ? (opt.val ? '#FDE68A' : '#BBF7D0') : '#E2DDD6'}`, background: evt.needsRide === opt.val ? (opt.val ? '#FFFBEB' : '#F0FDF4') : '#fff', color: evt.needsRide === opt.val ? (opt.val ? '#92400E' : '#14532D') : '#8B8599' }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-btn" onClick={addOffEvent}><Plus size={13} /> Add another event</button>
              </div>
          }
        </div>

        {/* Shopping list */}
        <div className="card">
          <div style={{ padding:'15px 18px 0' }}>
            <div className="label"><ShoppingCart size={12} /> Things you need</div>
            <p style={{ fontSize:13, color:'#8B8599', marginBottom:14, lineHeight:1.5 }}>Anything you need bought this week.</p>
          </div>
          {shopping.length === 0
            ? <div style={{ padding:'0 18px 16px' }}><button className="add-btn" onClick={addItem}><Plus size={13} /> Add an item</button></div>
            : <div style={{ padding:'0 18px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {shopping.map(item => (
                  <div key={item.id} className="fade-in" style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                      <input className="field" type="text" placeholder="What do you need?"
                        value={item.item} onChange={e => updateItem(item.id, 'item', e.target.value)} />
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:6 }}>
                        <input className="field" type="text" placeholder="How many?" value={item.qty}
                          onChange={e => updateItem(item.id, 'qty', e.target.value)} style={{ fontSize:13 }} />
                        <input className="field" type="text" placeholder="Any context? (optional)" value={item.why}
                          onChange={e => updateItem(item.id, 'why', e.target.value)} style={{ fontSize:13 }} />
                      </div>
                    </div>
                    <button className="btn-ghost" onClick={() => removeItem(item.id)} style={{ marginTop:10 }}><X size={14} /></button>
                  </div>
                ))}
                <button className="add-btn" onClick={addItem}><Plus size={13} /> Add another item</button>
              </div>
          }
        </div>

        {/* Meeting topics */}
        <div className="card">
          <div style={{ padding:'15px 18px 0' }}>
            <div className="label"><MessageSquare size={12} /> Bring it up at the meeting</div>
            <p style={{ fontSize:13, color:'#8B8599', marginBottom:12, lineHeight:1.5 }}>Anything you want to talk about Sunday?</p>
          </div>
          <div style={{ padding:'0 18px 16px', display:'flex', flexDirection:'column', gap:8 }}>
            {topics.map((t, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#F7F4EF', borderRadius:8 }}>
                <span style={{ fontSize:13, color:'#1A1A2E', flex:1 }}>{t}</span>
                <button className="btn-ghost" onClick={() => setTopics(ts => ts.filter((_,j) => j !== i))}><X size={13} /></button>
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

        {/* Submit */}
        <button onClick={() => submit(false)} disabled={submitting}
          style={{ width:'100%', background:'#1A1A2E', color:'#fff', border:'none', borderRadius:12, padding:'16px', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <CheckCircle size={18} /> {submitting ? 'Submitting…' : 'Submit my info'}
        </button>

      </div>
    </div>
  )
}
