'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Car, CheckCircle, AlertTriangle, Plus, X, Send, RefreshCw,
  ChevronDown, ChevronUp, ShoppingCart, MessageSquare, Calendar,
  Loader2, Mail
} from 'lucide-react'

const WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function MeetingPage() {
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [members,     setMembers]     = useState([])
  const [events,      setEvents]      = useState([])
  const [dinner,      setDinner]      = useState([])
  const [agenda,      setAgenda]      = useState([])
  const [submissions, setSubmissions] = useState([])
  const [shopping,    setShopping]    = useState([])
  const [weekStart,   setWeekStart]   = useState(null)
  const [weekLabel,   setWeekLabel]   = useState('This Week')
  const [selectedEvt, setSelectedEvt] = useState(null)
  const [newItem,     setNewItem]     = useState('')
  const [newAgenda,   setNewAgenda]   = useState('')
  const [calOpen,     setCalOpen]     = useState(true)
  const [subOpen,     setSubOpen]     = useState(true)
  const [confirmed,   setConfirmed]   = useState(false)
  const [confirming,  setConfirming]  = useState(false)
  const [confirmResult, setConfirmResult] = useState(null)
  const [updateSent,  setUpdateSent]  = useState(false)

  // ─── Load everything from APIs ────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load family members
      const famRes = await fetch('/api/family')
      const famData = await famRes.json()
      const memberList = famData.members ?? []
      setMembers(memberList)

      // Load admin state (this week's calendar + setup)
      const calRes = await fetch('/api/calendar')
      const calData = await calRes.json()

      if (calData.events) setEvents(calData.events)
      if (calData.weekStart) {
        setWeekStart(calData.weekStart)

        // Load saved admin state for this week
        const stateRes = await fetch(`/api/admin-state?weekStart=${calData.weekStart}`)
        const stateData = await stateRes.json()
        if (stateData.found && stateData.state) {
          const s = stateData.state
          if (s.events?.length) setEvents(s.events)
          if (s.dinner)         setDinner(s.dinner)
          if (s.agenda)         setAgenda(s.agenda)
        }

        // Load form submissions
        const subRes = await fetch(`/api/submissions?weekStart=${calData.weekStart}`)
        const subData = await subRes.json()
        if (subData.submissions) {
          setSubmissions(subData.submissions)
          // Merge shopping items from all kid submissions
          const allShopping = []
          subData.submissions.forEach(sub => {
            if (sub.payload?.shoppingItems) {
              sub.payload.shoppingItems.forEach(item => {
                if (item.item?.trim()) {
                  allShopping.push({
                    id: `${sub.memberId}-${item.item}`,
                    item: item.item,
                    qty: item.qty || '1',
                    who: getMemberName(memberList, sub.memberId),
                    checked: false,
                  })
                }
              })
            }
          })
          setShopping(allShopping)
        }

        // Build weekLabel
        const d = new Date(calData.weekStart + 'T00:00:00')
        const end = new Date(d); end.setDate(end.getDate() + 6)
        setWeekLabel(`Week of ${d.toLocaleDateString('en-US', { month:'short', day:'numeric' })} – ${end.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}`)
      }
    } catch (err) {
      setError('Failed to load meeting data. Make sure you have loaded the calendar in admin setup.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const getMemberName = (memberList, id) => memberList.find(m => m.id === id)?.name ?? id
  const getMember = id => members.find(m => m.id === id)

  const assignDriver = (eventId, val) => {
    setEvents(evs => {
      const updated = evs.map(e => e.id === eventId ? { ...e, driverId: val || null } : e)
      // Auto-save assignments back to AdminState
      if (weekStart) {
        fetch('/api/admin-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekStart,
            state: { events: updated, dinner, agenda }
          })
        }).catch(() => {})
      }
      return updated
    })
  }

  const toggleShopping = id =>
    setShopping(s => s.map(i => i.id === id ? { ...i, checked: !i.checked } : i))

  const addShoppingItem = () => {
    if (!newItem.trim()) return
    setShopping(s => [...s, { id: 'manual-'+Date.now(), item: newItem.trim(), qty: '1', who: 'Admin', checked: false }])
    setNewItem('')
  }

  const addAgendaItem = () => {
    if (!newAgenda.trim()) return
    setAgenda(a => [...a, newAgenda.trim()])
    setNewAgenda('')
  }

  const addOffCalEventToCalendar = (offEvt, memberId) => {
    const dayIdx = WEEK.indexOf(offEvt.day)
    if (dayIdx === -1) return
    setEvents(evs => [...evs, {
      id: 'off-' + Date.now(),
      title: offEvt.what,
      dayIdx,
      time: offEvt.time,
      sortMin: 0,
      location: offEvt.where,
      involvedIds: [memberId],
      transportStatus: offEvt.needsRide ? 'needs_driver' : 'no_transport',
      driverId: null,
      carpoolNote: '',
    }])
  }

  // Build the plan object for confirm
  const buildPlan = () => {
    const schedule = WEEK.map(day => {
      const dayIdx = WEEK.indexOf(day)
      const dayEvents = events
        .filter(e => e.dayIdx === dayIdx && e.transportStatus !== 'unset')
        .map(e => ({
          title:    e.title,
          time:     e.time,
          location: e.location ?? '',
          driver:   getMember(e.driverId)?.name ?? '',
          transportNote: e.transportStatus === 'no_transport' ? 'No transport needed' : '',
        }))
      return { day, events: dayEvents }
    })

    const dinnerGrid = WEEK.map((day, i) => {
      const slot = dinner.find(d => d.dayIdx === i) ?? { meal: '', cook: '' }
      return { day, meal: slot.meal, cook: slot.cook }
    })

    return {
      weekLabel,
      weekStart,
      confirmedAt: new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }),
      schedule,
      dinner:   dinnerGrid,
      shopping: shopping.filter(i => !i.checked),
      agenda,
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const plan = buildPlan()
      const res = await fetch('/api/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weekStart, plan }),
      })
      const data = await res.json()
      setConfirmResult(data.results)
      setConfirmed(true)
    } catch (err) {
      console.error('Confirm error:', err)
    }
    setConfirming(false)
  }

  const handleSendUpdate = async () => {
    if (!weekStart) return
    try {
      const plan = buildPlan()
      await fetch('/api/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weekStart, plan }),
      })
      setUpdateSent(true)
      setTimeout(() => setUpdateSent(false), 4000)
    } catch (_) {}
  }

  const gaps  = events.filter(e => e.transportStatus === 'needs_driver' && !e.driverId)
  const sel   = events.find(e => e.id === selectedEvt)
  const notSubmitted = members.filter(m => !submissions.find(s => s.memberId === m.id))
  const eventsByDay  = WEEK.map((_, i) => events.filter(e => e.dayIdx === i).sort((a, b) => (a.sortMin ?? 0) - (b.sortMin ?? 0)))

  const STATUS_COLORS = {
    needs_driver: { bg:'#FFFBEB', border:'#FDE68A', dot:'#D97706' },
    no_transport: { bg:'#F0FDF4', border:'#BBF7D0', dot:'#15803D' },
    assigned:     { bg:'#F0FDF4', border:'#BBF7D0', dot:'#15803D' },
    unset:        { bg:'#FEF2F2', border:'#FECACA', dot:'#EF4444' },
  }

  function chipStatus(evt) {
    if (evt.transportStatus === 'needs_driver' && evt.driverId) return 'assigned'
    return evt.transportStatus ?? 'unset'
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:15, color:'#8B8599' }}>
        <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> Loading meeting data…
      </div>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────
  if (error) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F7F4EF', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>Couldn't load meeting data</div>
        <p style={{ fontSize:14, color:'#8B8599', marginBottom:20 }}>{error}</p>
        <button onClick={loadData}
          style={{ background:'#C4522A', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          Try again
        </button>
      </div>
    </div>
  )

  // ── Confirmed ────────────────────────────────────────────────
  if (confirmed) return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign:'center', maxWidth:420 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'#F0FDF4', border:'2px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <CheckCircle size={36} color="#16A34A" />
        </div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>Week confirmed!</div>
        <p style={{ fontSize:15, color:'#8B8599', lineHeight:1.6, marginBottom:28 }}>The plan has been sent to everyone.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:28 }}>
          {[
            { icon:'✉', label:`Email sent to ${members.filter(m=>m.email).length} family members`, ok: confirmResult?.emailSent },
            { icon:'📱', label:`Texts sent to ${confirmResult?.textsSent ?? 0} family members`, ok: (confirmResult?.textsSent ?? 0) > 0 },
            { icon:'📅', label:`${confirmResult?.calendarEvents ?? 0} calendar events created`, ok: true },
          ].map((item,i) => (
            <div key={i} style={{ padding:'12px 16px', background:'#fff', borderRadius:10, border:'1px solid #E8E3DB', display:'flex', alignItems:'center', gap:10, fontSize:14, color:'#1A1A2E' }}>
              <span style={{ fontSize:18 }}>{item.icon}</span> {item.label}
            </div>
          ))}
        </div>
        <button onClick={handleSendUpdate}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'11px 22px', background:'#1A1A2E', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", margin:'0 auto' }}>
          <Send size={14} /> Send Mid-Week Update
        </button>
      </div>
    </div>
  )

  // ── Main meeting view ────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .card{background:#fff;border-radius:12px;border:1px solid #E8E3DB;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
        input,select{font-family:'DM Sans',sans-serif;outline:none}
        input:focus,select:focus{border-color:#C4522A!important;box-shadow:0 0 0 3px rgba(196,82,42,0.1)}
        .btn-ghost{background:none;border:none;cursor:pointer;color:#C4B8A8;padding:4px;display:flex;align-items:center}
        select{background:#fff;border:1.5px solid #DDD8CF;border-radius:6px;padding:4px 8px;font-size:13px;color:#2C2C3E;cursor:pointer}
        .chip{border-radius:7px;padding:6px 8px;cursor:pointer;border-width:1px 1px 1px 3px;border-style:solid;margin-bottom:5px}
        .chip:hover{opacity:0.82}
        .din{width:100%;border:1.5px solid #E2DDD6;border-radius:5px;padding:4px 6px;font-size:11px;color:#1A1A2E;background:#fff;font-family:'DM Sans',sans-serif}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.15s ease-out}
      `}</style>

      {/* HEADER */}
      <div style={{ background:'#1A1A2E', color:'#fff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'#7070A0', textTransform:'uppercase', marginBottom:4 }}>Family Weekly Planner · Sunday Meeting</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>{weekLabel}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {updateSent && <span style={{ fontSize:13, color:'#4ADE80', display:'flex', alignItems:'center', gap:5 }}><CheckCircle size={13} /> Update sent!</span>}
            <button onClick={loadData}
              style={{ background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', color:'#fff', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:"'DM Sans',sans-serif" }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={handleSendUpdate}
              style={{ background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', color:'#fff', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:"'DM Sans',sans-serif" }}>
              <Send size={13} /> Send Update
            </button>
          </div>
        </div>

        {gaps.length > 0 && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', background:'rgba(217,119,6,0.2)' }}>
            <div style={{ maxWidth:1200, margin:'0 auto', padding:'9px 24px', display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#FCD34D', flexWrap:'wrap' }}>
              <AlertTriangle size={13} />
              <strong>{gaps.length} event{gaps.length>1?'s':''} still need{gaps.length===1?'s':''} a driver:</strong>
              {gaps.map(g => g.title).join(' · ')}
            </div>
          </div>
        )}
        {notSubmitted.length > 0 && (
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', background:'rgba(220,38,38,0.15)' }}>
            <div style={{ maxWidth:1200, margin:'0 auto', padding:'9px 24px', display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#FCA5A5', flexWrap:'wrap' }}>
              <AlertTriangle size={13} />
              <strong>Hasn't submitted:</strong> {notSubmitted.map(m => m.name).join(', ')}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 24px 60px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16, alignItems:'start' }}>

          {/* LEFT */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* CALENDAR */}
            <div className="card">
              <button onClick={() => setCalOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'none', border:'none', cursor:'pointer', borderBottom: calOpen?'1px solid #F0EDE8':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Calendar size={15} style={{ color:'#C4522A' }} />
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:600, color:'#1A1A2E' }}>Week Schedule</span>
                  {gaps.length > 0
                    ? <span style={{ fontSize:11, background:'#FFFBEB', color:'#D97706', border:'1px solid #FDE68A', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{gaps.length} gaps</span>
                    : <span style={{ fontSize:11, background:'#F0FDF4', color:'#16A34A', border:'1px solid #BBF7D0', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>All covered ✓</span>
                  }
                </div>
                {calOpen ? <ChevronUp size={15} color="#8B8599" /> : <ChevronDown size={15} color="#8B8599" />}
              </button>

              {calOpen && (
                <>
                  <div style={{ overflowX:'auto' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(110px, 1fr))', minWidth:770 }}>
                      {WEEK.map((day, i) => (
                        <div key={i} style={{ padding:'8px 8px 6px', borderBottom:'2px solid #EDE8E0', borderRight: i<6?'1px solid #EDE8E0':'none', background:'#FAFAF7' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1A1A2E', textTransform:'uppercase', letterSpacing:'0.07em' }}>{day.slice(0,3)}</div>
                        </div>
                      ))}
                      {WEEK.map((_, dayIdx) => {
                        const dayEvts = eventsByDay[dayIdx]
                        const din = dinner.find(d => d.dayIdx === dayIdx) ?? { meal: '', cook: '' }
                        return (
                          <div key={dayIdx} style={{ padding:'6px 5px', borderRight: dayIdx<6?'1px solid #EDE8E0':'none', minHeight:120, display:'flex', flexDirection:'column' }}>
                            <div style={{ flex:1 }}>
                            {dayEvts.length === 0
                              ? <div style={{ fontSize:10, color:'#C4B8A8', fontStyle:'italic', textAlign:'center', paddingTop:8 }}>Free</div>
                              : dayEvts.map(evt => {
                                  const status = chipStatus(evt)
                                  const sc = STATUS_COLORS[status] ?? STATUS_COLORS.unset
                                  const firstMember = members.find(m => m.id === evt.involvedIds?.[0])
                                  const driver = members.find(m => m.id === evt.driverId)
                                  const isSchool = evt.id?.startsWith('school_')
                                  const isSchoolDrop = evt.id?.startsWith('school_drop_')

                                  // Get available adults for school events from submissions
                                  let schoolAvailable = []
                                  if (isSchool && !evt.driverId) {
                                    const slot = isSchoolDrop ? 'am' : 'pm'
                                    schoolAvailable = submissions
                                      .filter(s => {
                                        const sa = s.payload?.schoolAvailability
                                        if (!sa) return false
                                        const dayName = WEEK[evt.dayIdx]
                                        return sa[dayName]?.[slot] === true
                                      })
                                      .map(s => members.find(m => m.id === s.memberId)?.name)
                                      .filter(Boolean)
                                  }

                                  return (
                                    <div key={evt.id} className="chip"
                                      onClick={() => setSelectedEvt(selectedEvt === evt.id ? null : evt.id)}
                                      style={{ background:sc.bg, borderColor:sc.border, borderLeftColor: firstMember?.color ?? sc.dot, outline: selectedEvt===evt.id?'2px solid #C4522A':'none', outlineOffset:1 }}>
                                      <div style={{ fontSize:10, fontWeight:600, color:'#1A1A2E', lineHeight:1.3 }}>{evt.title}</div>
                                      <div style={{ fontSize:9, color:'#8B8599', marginTop:1 }}>{evt.time}</div>
                                      {evt.transportStatus === 'needs_driver' && (
                                        <div style={{ fontSize:9, marginTop:2, color: evt.driverId?'#15803D':'#D97706', fontWeight:600 }}>
                                          {evt.driverId ? `🚗 ${driver?.name}` : '⚠ No driver'}
                                        </div>
                                      )}
                                      {evt.transportStatus === 'no_transport' && (
                                        <div style={{ fontSize:9, marginTop:2, color:'#15803D', fontWeight:500 }}>✓ No transport needed</div>
                                      )}
                                      {isSchool && !evt.driverId && schoolAvailable.length > 0 && (
                                        <div style={{ fontSize:9, marginTop:3, color:'#1D4ED8', fontWeight:600 }}>
                                          Available: {schoolAvailable.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                            }
                            </div>
                            {/* Dinner slot */}
                            <div style={{ borderTop:'1px dashed #E2DDD6', paddingTop:5, marginTop:5 }}>
                              <div style={{ fontSize:8, fontWeight:700, color:'#B0A898', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>🍽</div>
                              {din.meal
                                ? <>
                                    <div style={{ fontSize:10, fontWeight:600, color:'#92400E' }}>{din.meal}</div>
                                    {din.cook && <div style={{ fontSize:9, color:'#B45309', marginTop:1 }}>{din.cook}</div>}
                                  </>
                                : <div style={{ fontSize:9, color:'#C4B8A8', fontStyle:'italic' }}>TBD</div>
                              }
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {sel && (
                    <div className="fade-in" style={{ borderTop:'2px solid #C4522A', background:'#1A1A2E', borderRadius:'0 0 12px 12px', padding:'18px 20px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                        <div>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:'#fff', marginBottom:2 }}>{sel.title}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{sel.time}{sel.location ? ` · ${sel.location}` : ''}</div>
                        </div>
                        <button className="btn-ghost" onClick={() => setSelectedEvt(null)}><X size={16} color="rgba(255,255,255,0.3)" /></button>
                      </div>

                      {sel.transportStatus === 'needs_driver' ? (
                        <div>
                          <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
                            Who can drive?
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                            {members.filter(m => m.type === 'adult').map(a => {
                              const sub      = submissions.find(s => s.memberId === a.id)
                              const response = sub?.payload?.drivingResponses?.[sel.id]
                              const canDrive = response === true
                              const cantDrive= response === false
                              const noAnswer = response == null
                              const assigned = sel.driverId === a.id
                              return (
                                <div key={a.id}
                                  onClick={() => assignDriver(sel.id, assigned ? null : a.id)}
                                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:9, cursor:'pointer', transition:'all 0.12s',
                                    background: assigned ? a.color : canDrive ? 'rgba(74,222,128,0.1)' : cantDrive ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)',
                                    border: `1.5px solid ${assigned ? a.color : canDrive ? 'rgba(74,222,128,0.3)' : cantDrive ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)'}`,
                                  }}>
                                  <span style={{ width:28, height:28, borderRadius:'50%', background: assigned?'rgba(255,255,255,0.25)':a.color, color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    {a.name[0]}
                                  </span>
                                  <span style={{ fontSize:13, fontWeight:600, color:'#fff', flex:1 }}>{a.name}</span>
                                  {assigned   && <span style={{ fontSize:11, background:'rgba(255,255,255,0.2)', color:'#fff', padding:'3px 9px', borderRadius:6, fontWeight:700 }}>🚗 Assigned</span>}
                                  {!assigned && canDrive  && <span style={{ fontSize:11, color:'#4ADE80', fontWeight:600 }}>✓ Available</span>}
                                  {!assigned && cantDrive && <span style={{ fontSize:11, color:'rgba(239,68,68,0.7)', fontWeight:500 }}>✗ Not available</span>}
                                  {!assigned && noAnswer  && <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontStyle:'italic' }}>No response</span>}
                                </div>
                              )
                            })}
                          </div>
                          <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:10, fontStyle:'italic' }}>Tap a person to assign or unassign them as driver.</p>
                        </div>
                      ) : (
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontStyle:'italic' }}>
                          No transport needed for this event.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* SHOPPING */}
            <div className="card">
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #F0EDE8', display:'flex', alignItems:'center', gap:10 }}>
                <ShoppingCart size={15} style={{ color:'#C4522A' }} />
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:600, color:'#1A1A2E' }}>Shopping List</span>
                <span style={{ fontSize:11, background:'#F0EDE8', color:'#8B8599', padding:'2px 8px', borderRadius:12 }}>{shopping.filter(i => !i.checked).length} items</span>
              </div>
              <div style={{ padding:'14px 20px' }}>
                {shopping.length === 0
                  ? <p style={{ fontSize:13, color:'#C4B8A8', fontStyle:'italic' }}>No shopping requests yet. Items submitted on family forms will appear here.</p>
                  : <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                      {shopping.map(item => (
                        <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background: item.checked?'#F7F4EF':'#fff', borderRadius:8, border:`1px solid ${item.checked?'#E2DDD6':'#E8E3DB'}`, opacity: item.checked?0.6:1 }}>
                          <input type="checkbox" checked={item.checked} onChange={() => toggleShopping(item.id)}
                            style={{ cursor:'pointer', accentColor:'#C4522A', width:15, height:15, flexShrink:0 }} />
                          <span style={{ flex:1, fontSize:13, color:'#1A1A2E', textDecoration: item.checked?'line-through':'none' }}>
                            {item.qty !== '1' ? `${item.qty} × ` : ''}{item.item}
                          </span>
                          <span style={{ fontSize:11, color:'#8B8599' }}>from {item.who}</span>
                          <button className="btn-ghost" onClick={() => setShopping(s => s.filter(i => i.id !== item.id))}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                }
                <div style={{ display:'flex', gap:8 }}>
                  <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && addShoppingItem()} placeholder="Add an item…"
                    style={{ flex:1, border:'1.5px solid #E8E3DB', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#1A1A2E' }} />
                  <button onClick={addShoppingItem}
                    style={{ background:'#C4522A', color:'#fff', border:'none', borderRadius:8, padding:'0 14px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* SUBMISSIONS */}
            <div className="card">
              <button onClick={() => setSubOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', borderBottom: subOpen?'1px solid #F0EDE8':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <MessageSquare size={14} style={{ color:'#C4522A' }} />
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:600, color:'#1A1A2E' }}>Submissions</span>
                  <span style={{ fontSize:11, background: notSubmitted.length>0?'#FEF2F2':'#F0FDF4', color: notSubmitted.length>0?'#DC2626':'#16A34A', border:`1px solid ${notSubmitted.length>0?'#FECACA':'#BBF7D0'}`, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>
                    {submissions.length}/{members.length}
                  </span>
                </div>
                {subOpen ? <ChevronUp size={14} color="#8B8599" /> : <ChevronDown size={14} color="#8B8599" />}
              </button>

              {subOpen && (
                <div style={{ padding:'10px 16px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                  {members.map(member => {
                    const sub = submissions.find(s => s.memberId === member.id)
                    const offEvents = sub?.payload?.offCalendarEvents ?? []
                    const topics    = sub?.payload?.meetingTopics ?? []
                    const unavailable = sub?.payload?.unavailableDays ?? []
                    return (
                      <div key={member.id} style={{ padding:'10px 12px', background: !sub?'#FEF2F2':'#FAFAF7', borderRadius:9, border:`1px solid ${!sub?'#FECACA':'#EDE8E0'}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom: (offEvents.length||topics.length||unavailable.length)?8:0 }}>
                          <span style={{ width:22, height:22, borderRadius:'50%', background:member.color, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {member.name[0]}
                          </span>
                          <span style={{ fontSize:13, fontWeight:600, color:'#1A1A2E', flex:1 }}>{member.name}</span>
                          {!sub
                            ? <span style={{ fontSize:11, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', padding:'2px 7px', borderRadius:6, fontWeight:600 }}>Not submitted</span>
                            : sub.payload?.allGood
                              ? <span style={{ fontSize:11, background:'#F0FDF4', color:'#16A34A', border:'1px solid #BBF7D0', padding:'2px 7px', borderRadius:6, fontWeight:600 }}>All good</span>
                              : <span style={{ fontSize:11, color:'#8B8599' }}>{new Date(sub.submittedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                          }
                        </div>
                        {offEvents.map((evt, i) => (
                          <div key={i} style={{ marginTop:6, padding:'7px 9px', background:'#fff', borderRadius:6, border:'1px solid #E8E3DB' }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#1A1A2E' }}>{evt.what}</div>
                            <div style={{ fontSize:11, color:'#8B8599', marginTop:1 }}>{evt.day} · {evt.time}{evt.where ? ` · ${evt.where}` : ''}</div>
                            {evt.needsRide && (
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:5 }}>
                                <span style={{ fontSize:11, color:'#D97706', fontWeight:600 }}>🚗 Needs a ride</span>
                                <button onClick={() => addOffCalEventToCalendar(evt, member.id)}
                                  style={{ fontSize:11, color:'#C4522A', background:'none', border:'1px solid #C4522A', borderRadius:5, padding:'2px 8px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                                  + Add to calendar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {topics.map((t, i) => (
                          <div key={i} style={{ marginTop:5, fontSize:12, color:'#4A4A5A', padding:'5px 8px', background:'#F0EDE8', borderRadius:5 }}>
                            💬 {t}
                          </div>
                        ))}
                        {unavailable.length > 0 && (
                          <div style={{ marginTop:5, fontSize:12, color:'#DC2626', padding:'5px 8px', background:'#FEF2F2', borderRadius:5 }}>
                            ✗ Out: {unavailable.join(', ')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* AGENDA */}
            <div className="card">
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #F0EDE8', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:15 }}>📋</span>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:600, color:'#1A1A2E' }}>Agenda</span>
                <span style={{ fontSize:11, background:'#F0EDE8', color:'#8B8599', padding:'2px 7px', borderRadius:10 }}>{agenda.length}</span>
              </div>
              <div style={{ padding:'12px 16px' }}>
                {/* Items from admin setup */}
                {agenda.map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', marginBottom:5, background:'#F7F4EF', borderRadius:7 }}>
                    <span style={{ fontSize:12, color:'#C4522A', fontWeight:700, minWidth:18 }}>{i+1}.</span>
                    <span style={{ fontSize:13, color:'#1A1A2E', flex:1 }}>{item}</span>
                    <button className="btn-ghost" onClick={() => setAgenda(a => a.filter((_,j) => j !== i))}><X size={12} /></button>
                  </div>
                ))}
                {/* Topics submitted via forms */}
                {submissions.flatMap(sub =>
                  (sub.payload?.meetingTopics ?? []).map((t, i) => ({
                    text: t,
                    who: getMember(sub.memberId)?.name ?? sub.memberId,
                    key: `${sub.memberId}-${i}`
                  }))
                ).map(item => (
                  <div key={item.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', marginBottom:5, background:'#F0EDE8', borderRadius:7 }}>
                    <span style={{ fontSize:12, color:'#8B8599', minWidth:18 }}>💬</span>
                    <span style={{ fontSize:13, color:'#1A1A2E', flex:1 }}>{item.text}</span>
                    <span style={{ fontSize:11, color:'#8B8599' }}>{item.who}</span>
                  </div>
                ))}
                <div style={{ display:'flex', gap:7, marginTop:6 }}>
                  <input type="text" value={newAgenda} onChange={e => setNewAgenda(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && addAgendaItem()} placeholder="Add topic…"
                    style={{ flex:1, border:'1.5px solid #E8E3DB', borderRadius:7, padding:'7px 10px', fontSize:13, color:'#1A1A2E' }} />
                  <button onClick={addAgendaItem}
                    style={{ background:'#C4522A', color:'#fff', border:'none', borderRadius:7, padding:'0 12px', cursor:'pointer', display:'flex', alignItems:'center' }}>
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* CONFIRM */}
            <div style={{ background:'linear-gradient(135deg,#1A1A2E,#2D2D4A)', borderRadius:12, padding:20, color:'#fff' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, marginBottom:6 }}>Ready to confirm?</div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.5, marginBottom:16 }}>
                Sends the final plan to everyone, creates driver calendar events, and updates the live plan page.
                {gaps.length > 0 && <span style={{ color:'#FCD34D' }}> {gaps.length} transport gap{gaps.length>1?'s':''} still open.</span>}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {[
                  { icon:<Mail size={13}/>,    text:`Email to ${members.filter(m=>m.email).length} family members` },
                  { icon:<Calendar size={13}/>, text:'Calendar invites for all drivers' },
                  { icon:<Send size={13}/>,     text:'Text everyone the live plan link' },
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'rgba(255,255,255,0.6)' }}>
                    <span style={{ color:'#4ADE80', flexShrink:0 }}>{item.icon}</span> {item.text}
                  </div>
                ))}
              </div>
              <button onClick={handleConfirm} disabled={confirming}
                style={{ width:'100%', background:'#C4522A', color:'#fff', border:'none', borderRadius:9, padding:'13px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {confirming
                  ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> Confirming…</>
                  : <><CheckCircle size={16} /> Confirm &amp; Send</>
                }
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
