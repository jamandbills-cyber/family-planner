'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Car, CheckCircle, Loader2 } from 'lucide-react'

const WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function LivePlanPage() {
  const [plan,       setPlan]       = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [lastCheck,  setLastCheck]  = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPlan = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetch('/api/plan')
      if (res.status === 404) { setError('no_plan'); return }
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.plan) {
        setPlan(data.plan)
        setLastCheck(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }))
      }
    } catch {
      setError('load_failed')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchPlan()
    const interval = setInterval(() => fetchPlan(true), 180_000)
    return () => clearInterval(interval)
  }, [fetchPlan])

  const todayIdx = new Date().getDay()

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:15, color:'#8B8599' }}>
        <Loader2 size={18} style={{ animation:'spin 1s linear infinite', color:'#C4522A' }} /> Loading weekly plan…
      </div>
    </div>
  )

  if (error === 'no_plan') return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF', padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📅</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>No plan yet this week</div>
        <p style={{ fontSize:14, color:'#8B8599', lineHeight:1.6 }}>The weekly plan will appear here after the family meeting on Sunday.</p>
      </div>
    </div>
  )

  if ((error === 'load_failed') && !plan) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF', padding:24 }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>Couldn't load plan</div>
        <button onClick={() => fetchPlan()} style={{ background:'#C4522A', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Try again</button>
      </div>
    </div>
  )

  if (!plan) return null

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .card{background:#fff;border-radius:12px;border:1px solid #E8E3DB;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{ background:'#1A1A2E', color:'#fff', padding:'20px 20px 24px' }}>
        <div style={{ maxWidth:600, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'#7070A0', textTransform:'uppercase', marginBottom:4 }}>Family Weekly Plan</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>{plan.weekLabel ?? 'This Week'}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:3 }}>
              Confirmed {plan.confirmedAt}
              {lastCheck && ` · Checked ${lastCheck}`}
            </div>
          </div>
          <button onClick={() => fetchPlan(true)} disabled={refreshing}
            style={{ background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:"'DM Sans',sans-serif" }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'20px 16px 48px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Schedule — one card per day that has content */}
        <div className="card">
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #F0EDE8' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:600, color:'#1A1A2E' }}>📅 Week Schedule</div>
          </div>
          <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:18 }}>
            {WEEK.map((day, dayIdx) => {
              const dayPlan   = (plan.schedule ?? []).find((d: any) => d.day === day) ?? { events: [] }
              const dinner    = (plan.dinner ?? []).find((d: any) => d.day === day)
              const isToday   = dayIdx === todayIdx

              // Find school events for this day
              const schoolDrop   = (dayPlan.events ?? []).find((e: any) => e.title?.toLowerCase().includes('drop-off') || e.title?.toLowerCase().includes('drop'))
              const schoolPickup = (dayPlan.events ?? []).find((e: any) => e.title?.toLowerCase().includes('pick-up') || e.title?.toLowerCase().includes('pickup'))
              const nonSchool    = (dayPlan.events ?? []).filter((e: any) =>
                !e.title?.toLowerCase().includes('drop-off') &&
                !e.title?.toLowerCase().includes('drop') &&
                !e.title?.toLowerCase().includes('pick-up') &&
                !e.title?.toLowerCase().includes('pickup')
              )

              const hasContent = nonSchool.length > 0 || schoolDrop || schoolPickup || dinner?.meal

              if (!hasContent) return null

              return (
                <div key={day}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'#1A1A2E' }}>{day}</span>
                    {isToday && <span style={{ fontSize:10, background:'#C4522A', color:'#fff', padding:'2px 8px', borderRadius:10, fontWeight:700 }}>TODAY</span>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>

                    {/* School runs */}
                    {(schoolDrop || schoolPickup) && (
                      <div style={{ padding:'10px 12px', background:'#EFF6FF', borderRadius:9, border:'1px solid #BFDBFE', borderLeft:'3px solid #1D4ED8' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#1D4ED8', marginBottom:4 }}>🏫 School</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {schoolDrop && (
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                              <span style={{ color:'#1A1A2E' }}>Drop-off {schoolDrop.time}</span>
                              {schoolDrop.driver && <span style={{ color:'#1D4ED8', fontWeight:600 }}>🚗 {schoolDrop.driver}</span>}
                              {!schoolDrop.driver && <span style={{ color:'#D97706', fontWeight:500 }}>⚠ No driver</span>}
                            </div>
                          )}
                          {schoolPickup && (
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                              <span style={{ color:'#1A1A2E' }}>Pick-up {schoolPickup.time}</span>
                              {schoolPickup.driver && <span style={{ color:'#1D4ED8', fontWeight:600 }}>🚗 {schoolPickup.driver}</span>}
                              {!schoolPickup.driver && <span style={{ color:'#D97706', fontWeight:500 }}>⚠ No driver</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Regular events */}
                    {nonSchool.map((evt: any, j: number) => (
                      <div key={j} style={{ display:'flex', gap:10, padding:'10px 12px', background:'#FAFAF7', borderRadius:9, border:'1px solid #EDE8E0', borderLeft:`3px solid ${evt.driver ? '#C4522A' : '#E2DDD6'}` }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1A1A2E' }}>{evt.title}</div>
                          <div style={{ fontSize:12, color:'#8B8599', marginTop:1 }}>
                            {evt.time}{evt.location ? ` · ${evt.location}` : ''}
                          </div>
                        </div>
                        {evt.driver && (
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#4A4A5A', flexShrink:0 }}>
                            <Car size={12} style={{ color:'#C4522A' }} />
                            <span style={{ fontWeight:600 }}>{evt.driver}</span>
                          </div>
                        )}
                        {!evt.driver && evt.transportNote && (
                          <div style={{ fontSize:11, color:'#15803D', flexShrink:0, display:'flex', alignItems:'center', gap:4 }}>
                            <CheckCircle size={11} />{evt.transportNote}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Dinner */}
                    {dinner?.meal && (
                      <div style={{ padding:'9px 12px', background:'#FFFBF5', borderRadius:9, border:'1px solid #FDE8CC', borderLeft:'3px solid #F59E0B' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#92400E' }}>
                          🍽 Dinner: {dinner.meal}
                          {dinner.cook && <span style={{ fontWeight:400, color:'#B45309' }}> · {dinner.cook} cooking</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Shopping list */}
        {(plan.shopping ?? []).length > 0 && (
          <div className="card">
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F0EDE8' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:600, color:'#1A1A2E' }}>🛒 Shopping List</div>
            </div>
            <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:7 }}>
              {plan.shopping.map((item: any, i: number) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#FAFAF7', borderRadius:8, border:'1px solid #EDE8E0' }}>
                  <span style={{ fontSize:13, color:'#1A1A2E', flex:1 }}>
                    {item.qty && item.qty !== '1' ? `${item.qty} × ` : ''}{item.item}
                  </span>
                  <span style={{ fontSize:11, color:'#8B8599' }}>from {item.who}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agenda */}
        {(plan.agenda ?? []).length > 0 && (
          <div className="card">
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F0EDE8' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:600, color:'#1A1A2E' }}>📋 Meeting Notes</div>
            </div>
            <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:6 }}>
              {plan.agenda.map((item: string, i: number) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#FAFAF7', borderRadius:8 }}>
                  <span style={{ fontSize:13, color:'#C4522A', fontWeight:700, minWidth:20 }}>{i+1}.</span>
                  <span style={{ fontSize:13, color:'#1A1A2E' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign:'center', fontSize:12, color:'#C4B8A8', paddingTop:8, lineHeight:1.7 }}>
          Updates automatically · Bookmark this page
        </div>
      </div>
    </div>
  )
}
