'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, X, CheckCircle, ShoppingCart, MessageSquare } from 'lucide-react'

const WEEK  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const TIMES = ['Morning','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','Noon',
  '1:00 PM','2:00 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM',
  '5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','Evening','All Day']

function emptyItem() { return { id: Date.now(), item:'', qty:'' } }

export default function KidFormPage() {
  const params = useParams()
  const token  = params?.token as string

  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [kidName,     setKidName]     = useState('')
  const [weekLabel,   setWeekLabel]   = useState('')
  const [eventsByDay, setEventsByDay] = useState<Record<number, any[]>>({})
  const [submitted,   setSubmitted]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [shopping,    setShopping]    = useState<ReturnType<typeof emptyItem>[]>([])
  const [topics,      setTopics]      = useState<string[]>([])
  const [newTopic,    setNewTopic]    = useState('')

  useEffect(() => {
    async function load() {
      if (!token) { setError('Invalid link'); setLoading(false); return }
      try {
        const res = await fetch(`/api/form/kid/${token}`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setKidName(data.name)
        setWeekLabel(data.weekLabel)
        setEventsByDay(data.eventsByDay ?? {})
      } catch {
        setError('This link is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

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
      shoppingItems: isAllGood ? [] : shopping,
      meetingTopics: isAllGood ? [] : topics,
    }
    try {
      await fetch('/api/submit/kid', {
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
      <div style={{ fontSize:14, color:'#8B8599' }}>Loading…</div>
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
      <div style={{ textAlign:'center', maxWidth:340 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'#F0FDF4', border:'2px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <CheckCircle size={36} style={{ color:'#16A34A' }} />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>You're all set{kidName ? `, ${kidName}` : ''}!</div>
        <div style={{ fontSize:15, color:'#8B8599', lineHeight:1.6, marginBottom:20 }}>See you at the family meeting Sunday!</div>
        <div style={{ padding:'14px 20px', background:'white', borderRadius:12, border:'1px solid #E8E3DB', fontSize:13, color:'#8B8599' }}>📅 Family Meeting · This Sunday</div>
      </div>
    </div>
  )

  const hasAnything = shopping.length > 0 || topics.length > 0

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

      {/* Header */}
      <div style={{ background:'#1A1A2E', color:'#fff', padding:'24px 20px 28px' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', color:'#7070A0', textTransform:'uppercase', marginBottom:6 }}>Family Weekly Planning</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, marginBottom:4 }}>Hey {kidName}! 👋</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)' }}>{weekLabel}</div>
        </div>
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'20px 16px 48px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* 7-DAY GRID */}
        <div className="card">
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #F5F2EC' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#1A1A2E' }}>Your week at a glance</div>
            <div style={{ fontSize:12, color:'#8B8599', marginTop:3 }}>Events that involve you are highlighted.</div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(110px, 1fr))', minWidth:770 }}>
              {WEEK.map((day, dayIdx) => {
                const dayEvts = [...(eventsByDay[dayIdx] ?? [])].sort((a: any, b: any) => (a.sortMin ?? 0) - (b.sortMin ?? 0))
                return (
                  <div key={dayIdx} style={{ borderRight: dayIdx < 6 ? '1px solid #F0EDE8' : 'none', display:'flex', flexDirection:'column' }}>
                    <div style={{ padding:'8px 8px 6px', background:'#FAFAF7', borderBottom:'1px solid #F0EDE8', textAlign:'center' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#1A1A2E', textTransform:'uppercase', letterSpacing:'0.07em' }}>{day.slice(0,3)}</div>
                    </div>
                    <div style={{ padding:'5px', flex:1, display:'flex', flexDirection:'column', gap:4, minHeight:90 }}>
                      {dayEvts.length === 0 && (
                        <div style={{ fontSize:9, color:'#C4B8A8', fontStyle:'italic', textAlign:'center', paddingTop:10 }}>Free</div>
                      )}
                      {dayEvts.map((evt: any) => {
                        const yours = evt.isYours
                        return (
                          <div key={evt.id} style={{ padding:'5px 6px', borderRadius:6, fontSize:10,
                            background: yours ? '#FEF0EA' : '#F7F4EF',
                            border: `1px solid ${yours ? '#FBBF99' : '#EDE8E0'}`,
                            borderLeft: `3px solid ${yours ? '#C4522A' : '#E2DDD6'}`,
                          }}>
                            <div style={{ fontWeight: yours ? 700 : 500, color:'#1A1A2E', lineHeight:1.3 }}>{evt.title}</div>
                            <div style={{ color:'#8B8599', marginTop:1 }}>{evt.time}</div>
                            {evt.driver && (
                              <div style={{ color:'#C4522A', marginTop:2, fontWeight:600 }}>🚗 {evt.driver}</div>
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
            <span style={{ display:'inline-block', width:8, height:8, borderRadius:1, background:'#C4522A', marginRight:4 }} />
            Orange border = events that involve you
          </div>
        </div>

        {/* SHOPPING */}
        <div className="card">
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #F5F2EC', display:'flex', alignItems:'center', gap:8 }}>
            <ShoppingCart size={15} style={{ color:'#C4522A' }} />
            <span style={{ fontSize:15, fontWeight:700, color:'#1A1A2E' }}>Need anything this week?</span>
          </div>
          <div style={{ padding:'14px 18px' }}>
            {shopping.length === 0
              ? <button className="add-btn" onClick={addItem}><Plus size={13} /> Add an item</button>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {shopping.map(item => (
                    <div key={item.id} style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input className="field" type="text" placeholder="What do you need?" value={item.item}
                        onChange={e => updateItem(item.id,'item',e.target.value)} style={{ flex:2 }} />
                      <input className="field" type="text" placeholder="How many?" value={item.qty}
                        onChange={e => updateItem(item.id,'qty',e.target.value)} style={{ flex:1 }} />
                      <button className="btn-ghost" onClick={() => removeItem(item.id)}><X size={14} /></button>
                    </div>
                  ))}
                  <button className="add-btn" onClick={addItem}><Plus size={13} /> Add another</button>
                </div>
            }
          </div>
        </div>

        {/* MEETING TOPICS */}
        <div className="card">
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #F5F2EC', display:'flex', alignItems:'center', gap:8 }}>
            <MessageSquare size={15} style={{ color:'#C4522A' }} />
            <span style={{ fontSize:15, fontWeight:700, color:'#1A1A2E' }}>Anything to bring up Sunday?</span>
          </div>
          <div style={{ padding:'14px 18px' }}>
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

        {/* Submit */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => submit(false)} disabled={submitting}
            style={{ width:'100%', background:'#1A1A2E', color:'#fff', border:'none', borderRadius:12, padding:'16px', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <CheckCircle size={18} /> {submitting ? 'Submitting…' : 'Submit my info'}
          </button>
          {!hasAnything && (
            <button onClick={() => submit(true)} disabled={submitting}
              style={{ width:'100%', background:'#fff', color:'#8B8599', border:'1.5px solid #E2DDD6', borderRadius:12, padding:'13px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              Nothing to add — all good this week ✓
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
