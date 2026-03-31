'use client'

import { useState } from 'react'
import {
  Car, CheckCircle, AlertTriangle, Plus, X, Send, RefreshCw,
  ChevronDown, ChevronUp, ShoppingCart, MessageSquare, Calendar,
  Clock, Loader2, Mail
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════
// MOCK DATA — replaced by Google Sheets API in production
// ═══════════════════════════════════════════════════════════
const FAMILY = {
  adults: [
    { id:'steve',  name:'Steve',  color:'#1D4ED8' },
    { id:'mom',    name:'Mom',    color:'#7C3AED' },
    { id:'dad',    name:'Dad',    color:'#047857' },
    { id:'chris',  name:'Chris',  color:'#B45309' },
  ],
  kids: [
    { id:'boston', name:'Boston', color:'#DC2626' },
    { id:'justin', name:'Justin', color:'#0891B2' },
    { id:'sadie',  name:'Sadie',  color:'#DB2777' },
    { id:'hailee', name:'Hailee', color:'#65A30D' },
  ]
}
const ALL_MEMBERS = [...FAMILY.adults, ...FAMILY.kids]
const getMember = (id) => ALL_MEMBERS.find(m => m.id === id)

const WEEK = [
  { label:'Sunday',    short:'Sun', date:'Mar 29' },
  { label:'Monday',    short:'Mon', date:'Mar 30' },
  { label:'Tuesday',   short:'Tue', date:'Mar 31' },
  { label:'Wednesday', short:'Wed', date:'Apr 1'  },
  { label:'Thursday',  short:'Thu', date:'Apr 2'  },
  { label:'Friday',    short:'Fri', date:'Apr 3'  },
  { label:'Saturday',  short:'Sat', date:'Apr 4'  },
]

const INIT_EVENTS = [
  { id:'e1',  title:'Boston – Soccer Practice',   dayIdx:0, time:'4:00–6:00 PM',  location:'Alta HS Fields',               involvedIds:['boston'],  transportStatus:'needs_driver', driverId:'mom',  carpoolNote:'' },
  { id:'e2',  title:'Hailee – Piano Lessons',      dayIdx:0, time:'5:00–6:00 PM',  location:'Murray Music Studio',          involvedIds:['hailee'],  transportStatus:'needs_driver', driverId:null,   carpoolNote:'' },
  { id:'e3',  title:'Justin – Baseball Practice',  dayIdx:1, time:'3:30–5:30 PM',  location:'Brighton HS',                  involvedIds:['justin'],  transportStatus:'needs_driver', driverId:'dad',  carpoolNote:'' },
  { id:'e4',  title:'Steve – PTA Meeting',         dayIdx:1, time:'7:00 PM',       location:'District Office',              involvedIds:['steve'],   transportStatus:'no_transport', driverId:null,   carpoolNote:'' },
  { id:'e5',  title:'Boston – Soccer Game',        dayIdx:2, time:'4:00–6:00 PM',  location:'Jordan Valley Soccer Complex', involvedIds:['boston'],  transportStatus:'needs_driver', driverId:null,   carpoolNote:'' },
  { id:'e6',  title:'Family Dinner Out',           dayIdx:2, time:'6:30 PM',       location:'TBD',                          involvedIds:['steve','mom','dad','chris','boston','justin','sadie','hailee'], transportStatus:'no_transport', driverId:null, carpoolNote:'' },
  { id:'e7',  title:'Sadie – Drama Rehearsal',     dayIdx:3, time:'3:30–5:30 PM',  location:'Hillcrest HS',                 involvedIds:['sadie'],   transportStatus:'needs_driver', driverId:null,   carpoolNote:'' },
  { id:'e8',  title:'Hailee – Orthodontist',       dayIdx:3, time:'2:00 PM',       location:'Sandy Orthodontics',           involvedIds:['hailee'],  transportStatus:'needs_driver', driverId:'chris',carpoolNote:'' },
  { id:'e9',  title:'Justin – Baseball Game',      dayIdx:4, time:'4:00 PM',       location:'Bingham HS',                   involvedIds:['justin'],  transportStatus:'needs_driver', driverId:'dad',  carpoolNote:'' },
  { id:'e10', title:'Boston – Soccer Tournament',  dayIdx:5, time:'All Day',       location:'Utah Valley Soccer Complex',   involvedIds:['boston'],  transportStatus:'needs_driver', driverId:null,   carpoolNote:'' },
  { id:'e11', title:'Family Meeting',              dayIdx:6, time:'5:00 PM',       location:'Home',                         involvedIds:['steve','mom','dad','chris','boston','justin','sadie','hailee'], transportStatus:'no_transport', driverId:null, carpoolNote:'' },
]

const INIT_DINNER = WEEK.map((_, i) => ({ dayIdx:i, meal:'', cook:'' }))

// Mock submissions from family forms
const MOCK_SUBMISSIONS = [
  { member:'boston', type:'kid',   submittedAt:'10:24 AM', offEvents:[], shopping:[{item:'Soccer cleats',qty:'1',why:'Old ones broke'}], topics:['Can we get a dog?'], allGood:false },
  { member:'justin', type:'kid',   submittedAt:'9:51 AM',  offEvents:[{what:"Friend's birthday party", day:'Saturday', time:'2:00 PM', where:"Jake's house", needsRide:true}], shopping:[{item:'Gift for Jake',qty:'1',why:'Birthday'}], topics:[], allGood:false },
  { member:'sadie',  type:'kid',   submittedAt:'11:02 AM', offEvents:[], shopping:[], topics:[], allGood:true },
  { member:'hailee', type:'kid',   submittedAt:'—',        offEvents:[], shopping:[], topics:[], allGood:false, notSubmitted:true },
  { member:'mom',    type:'adult', submittedAt:'8:30 AM',  drivingYes:['e5'], drivingNo:[], unavailable:[], offEvents:[], topics:['Need to discuss summer camp dates'] },
  { member:'dad',    type:'adult', submittedAt:'8:45 AM',  drivingYes:[], drivingNo:['e10'], unavailable:['Saturday'], offEvents:[{what:'Golf tournament',day:'Saturday',time:'8:00 AM',where:'Thanksgiving Point Golf'}], topics:[] },
  { member:'steve',  type:'adult', submittedAt:'9:15 AM',  drivingYes:['e2','e10'], drivingNo:[], unavailable:[], offEvents:[], topics:['Budget review'] },
  { member:'chris',  type:'adult', submittedAt:'—',        drivingYes:[], drivingNo:[], unavailable:[], offEvents:[], topics:[], notSubmitted:true },
]

export default function MeetingPage() {
  const [events,       setEvents]      = useState(INIT_EVENTS)
  const [dinner,       setDinner]      = useState(INIT_DINNER)
  const [agenda,       setAgenda]      = useState(['Summer camp dates','Budget review','Can we get a dog?'])
  const [newAgenda,    setNewAgenda]   = useState('')
  const [shopping,     setShopping]    = useState([
    { id:'s1', item:'Soccer cleats',  qty:'1', who:'Boston', checked:false },
    { id:'s2', item:'Gift for Jake',  qty:'1', who:'Justin', checked:false },
  ])
  const [newItem,      setNewItem]     = useState('')
  const [selectedEvt,  setSelectedEvt] = useState(null)
  const [confirmed,    setConfirmed]   = useState(false)
  const [sending,      setSending]     = useState(false)
  const [calOpen,      setCalOpen]     = useState(true)
  const [subOpen,      setSubOpen]     = useState(true)
  const [updateSent,   setUpdateSent]  = useState(false)

  const gaps = events.filter(e => e.transportStatus === 'needs_driver' && !e.driverId)
  const notSubmitted = MOCK_SUBMISSIONS.filter(s => s.notSubmitted)
  const sel = events.find(e => e.id === selectedEvt)
  const eventsByDay = WEEK.map((_,i) => events.filter(e => e.dayIdx === i))

  const assignDriver = (eventId, val) =>
    setEvents(ev => ev.map(e => e.id === eventId ? { ...e, driverId: val || null } : e))

  const updateDinner = (dayIdx, field, val) =>
    setDinner(d => d.map(s => s.dayIdx === dayIdx ? { ...s, [field]: val } : s))

  const toggleShopping = (id) =>
    setShopping(s => s.map(i => i.id === id ? { ...i, checked: !i.checked } : i))

  const addShoppingItem = () => {
    if (!newItem.trim()) return
    setShopping(s => [...s, { id:'s'+Date.now(), item:newItem.trim(), qty:'1', who:'Admin', checked:false }])
    setNewItem('')
  }

  const addAgendaItem = () => {
    if (!newAgenda.trim()) return
    setAgenda(a => [...a, newAgenda.trim()])
    setNewAgenda('')
  }

  // Add off-calendar event from submission to main calendar
  const addToCalendar = (evt, dayLabel) => {
    const dayIdx = WEEK.findIndex(d => d.label === dayLabel)
    if (dayIdx === -1) return
    setEvents(evs => [...evs, {
      id: 'e_'+Date.now(),
      title: evt.what,
      dayIdx,
      time: evt.time,
      location: evt.where,
      involvedIds: [],
      transportStatus: evt.needsRide ? 'needs_driver' : 'no_transport',
      driverId: null,
      carpoolNote: '',
    }])
  }

  const handleConfirm = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 2000))
    setSending(false)
    setConfirmed(true)
  }

  const handleSendUpdate = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 1500))
    setSending(false)
    setUpdateSent(true)
    setTimeout(() => setUpdateSent(false), 4000)
  }

  const STATUS_COLORS = {
    needs_driver: { bg:'#FFFBEB', border:'#FDE68A', dot:'#D97706' },
    no_transport: { bg:'#F0FDF4', border:'#BBF7D0', dot:'#15803D' },
    assigned:     { bg:'#F0FDF4', border:'#BBF7D0', dot:'#15803D' },
  }

  function chipStatus(evt) {
    if (evt.transportStatus === 'needs_driver' && evt.driverId) return 'assigned'
    return evt.transportStatus
  }

  if (confirmed) {
    return (
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
        <div style={{ textAlign:'center', maxWidth:420 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'#F0FDF4', border:'2px solid #BBF7D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
            <CheckCircle size={36} color="#16A34A" />
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:'#1A1A2E', marginBottom:10 }}>
            Week confirmed!
          </div>
          <p style={{ fontSize:15, color:'#8B8599', lineHeight:1.6, marginBottom:28 }}>
            Everyone has been emailed the final plan. Drivers have received calendar invites. The live plan page has been updated.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
            {[
              { icon:'✉', text:'Email sent to all 8 family members' },
              { icon:'📅', text:'Calendar invites sent to assigned drivers' },
              { icon:'🔗', text:'Live plan page updated' },
            ].map((item, i) => (
              <div key={i} style={{ padding:'12px 16px', background:'#fff', borderRadius:10, border:'1px solid #E8E3DB', display:'flex', alignItems:'center', gap:10, fontSize:14, color:'#1A1A2E' }}>
                <span style={{ fontSize:18 }}>{item.icon}</span> {item.text}
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
  }

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F7F4EF', minHeight:'100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .card{background:#fff;border-radius:12px;border:1px solid #E8E3DB;box-shadow:0 1px 4px rgba(0,0,0,0.04)}
        input,select{font-family:'DM Sans',sans-serif;outline:none}
        input:focus,select:focus{border-color:#C4522A!important;box-shadow:0 0 0 3px rgba(196,82,42,0.1)}
        .btn-ghost{background:none;border:none;cursor:pointer;color:#C4B8A8;padding:4px;display:flex;align-items:center}
        .btn-ghost:hover{color:#8B8599}
        select{background:#fff;border:1.5px solid #DDD8CF;border-radius:6px;padding:4px 8px;font-size:13px;color:#2C2C3E;cursor:pointer}
        .chip{border-radius:7px;padding:6px 8px;cursor:pointer;border-width:1px 1px 1px 3px;border-style:solid;margin-bottom:5px;transition:opacity 0.1s}
        .chip:hover{opacity:0.82}
        .din{width:100%;border:1.5px solid #E2DDD6;border-radius:5px;padding:4px 6px;font-size:11px;color:#1A1A2E;background:#fff;font-family:'DM Sans',sans-serif}
        .tag{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 0.15s ease-out}
      `}</style>

      {/* HEADER */}
      <div style={{ background:'#1A1A2E', color:'#fff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'#7070A0', textTransform:'uppercase', marginBottom:4 }}>
              Family Weekly Planner · Sunday Meeting
            </div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700 }}>Week of March 30, 2026</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {updateSent && (
              <span style={{ fontSize:13, color:'#4ADE80', display:'flex', alignItems:'center', gap:5 }}>
                <CheckCircle size={13} /> Update sent!
              </span>
            )}
            <button onClick={handleSendUpdate} disabled={sending}
              style={{ background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)', color:'#fff', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:"'DM Sans',sans-serif" }}>
              <RefreshCw size={13} /> Send Update
            </button>
          </div>
        </div>

        {/* Status bars */}
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
              <strong>Hasn't submitted:</strong> {notSubmitted.map(s => getMember(s.member)?.name).join(', ')}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 24px 60px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* TWO COLUMN LAYOUT */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16, alignItems:'start' }}>

          {/* LEFT — Calendar + Dinner */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* WEEK CALENDAR */}
            <div className="card">
              <button onClick={() => setCalOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom: calOpen ? '1px solid #F0EDE8' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Calendar size={15} style={{ color:'#C4522A' }} />
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:600, color:'#1A1A2E' }}>Week Schedule</span>
                  {gaps.length > 0 && <span style={{ fontSize:11, background:'#FFFBEB', color:'#D97706', border:'1px solid #FDE68A', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{gaps.length} gaps</span>}
                  {gaps.length === 0 && <span style={{ fontSize:11, background:'#F0FDF4', color:'#16A34A', border:'1px solid #BBF7D0', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>All covered ✓</span>}
                </div>
                {calOpen ? <ChevronUp size={15} color="#8B8599" /> : <ChevronDown size={15} color="#8B8599" />}
              </button>

              {calOpen && (
                <>
                  <div style={{ overflowX:'auto' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(110px, 1fr))', minWidth:770 }}>
                      {WEEK.map((day, i) => (
                        <div key={i} style={{ padding:'8px 8px 6px', borderBottom:'2px solid #EDE8E0', borderRight: i<6?'1px solid #EDE8E0':'none', background:'#FAFAF7' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1A1A2E', textTransform:'uppercase', letterSpacing:'0.07em' }}>{day.short}</div>
                          <div style={{ fontSize:10, color:'#A09898', marginTop:1 }}>{day.date}</div>
                        </div>
                      ))}
                      {WEEK.map((_, dayIdx) => {
                        const dayEvts = eventsByDay[dayIdx]
                        const din = dinner[dayIdx]
                        return (
                          <div key={dayIdx} style={{ padding:'6px 5px', borderRight: dayIdx<6?'1px solid #EDE8E0':'none', minHeight:140, display:'flex', flexDirection:'column' }}>
                            <div style={{ flex:1 }}>
                              {dayEvts.length === 0 && <div style={{ fontSize:10, color:'#C4B8A8', fontStyle:'italic', textAlign:'center', paddingTop:8 }}>Free</div>}
                              {dayEvts.map(evt => {
                                const status = chipStatus(evt)
                                const sc = STATUS_COLORS[status] ?? STATUS_COLORS.no_transport
                                const firstPerson = getMember(evt.involvedIds[0])
                                const isSelected = selectedEvt === evt.id
                                const driver = getMember(evt.driverId)
                                return (
                                  <div key={evt.id} className="chip"
                                    onClick={() => setSelectedEvt(isSelected ? null : evt.id)}
                                    style={{ background: sc.bg, borderColor: sc.border, borderLeftColor: firstPerson?.color ?? sc.dot, outline: isSelected ? '2px solid #C4522A' : 'none', outlineOffset:1 }}>
                                    <div style={{ fontSize:10, fontWeight:600, color:'#1A1A2E', lineHeight:1.3 }}>{evt.title}</div>
                                    <div style={{ fontSize:9, color:'#8B8599', marginTop:1 }}>{evt.time}</div>
                                    {evt.transportStatus === 'needs_driver' && (
                                      <div style={{ fontSize:9, marginTop:2, color: evt.driverId ? '#15803D' : '#D97706', fontWeight:600 }}>
                                        {evt.driverId ? `🚗 ${driver?.name}` : '⚠ No driver'}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ borderTop:'1px dashed #E2DDD6', paddingTop:4, marginTop:4 }}>
                              <div style={{ fontSize:8, fontWeight:700, color:'#B0A898', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>🍽 Dinner</div>
                              <input className="din" type="text" value={din.meal}
                                onChange={e => updateDinner(dayIdx,'meal',e.target.value)} placeholder="Meal?" />
                              <input className="din" type="text" value={din.cook}
                                onChange={e => updateDinner(dayIdx,'cook',e.target.value)}
                                placeholder="Who cooks?" style={{ marginTop:2 }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Edit panel */}
                  {sel && (
                    <div className="fade-in" style={{ borderTop:'2px solid #C4522A', background:'#1A1A2E', borderRadius:'0 0 12px 12px', padding:'18px 20px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, gap:8 }}>
                        <div>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:'#fff', marginBottom:2 }}>{sel.title}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{sel.time}{sel.location ? ` · ${sel.location}` : ''}</div>
                        </div>
                        <button className="btn-ghost" onClick={() => setSelectedEvt(null)}><X size={16} color="rgba(255,255,255,0.3)" /></button>
                      </div>
                      {sel.transportStatus === 'needs_driver' && (
                        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Assign driver:</span>
                          <select value={sel.driverId ?? ''} onChange={e => assignDriver(sel.id, e.target.value)}
                            style={{ background:'rgba(255,255,255,0.1)', border:'1.5px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:6, padding:'6px 10px', fontSize:13 }}>
                            <option value="">— No driver assigned —</option>
                            {FAMILY.adults.map(a => {
                              const submitted = MOCK_SUBMISSIONS.find(s => s.member === a.id)
                              const canDrive = submitted?.drivingYes?.includes(sel.id)
                              return <option key={a.id} value={a.id}>{a.name}{canDrive ? ' ✓ available' : ''}</option>
                            })}
                            <option value="__carpool__">Outside carpool</option>
                          </select>
                          <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontStyle:'italic' }}>
                            Adults who said yes: {MOCK_SUBMISSIONS.filter(s => s.drivingYes?.includes(sel.id)).map(s => getMember(s.member)?.name).join(', ') || 'None yet'}
                          </span>
                        </div>
                      )}
                      {sel.transportStatus === 'no_transport' && (
                        <div style={{ fontSize:13, color:'#4ADE80' }}>✓ No transport needed for this event</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* SHOPPING LIST */}
            <div className="card">
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #F0EDE8', display:'flex', alignItems:'center', gap:10 }}>
                <ShoppingCart size={15} style={{ color:'#C4522A' }} />
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:600, color:'#1A1A2E' }}>Shopping List</span>
                <span style={{ fontSize:11, background:'#F0EDE8', color:'#8B8599', padding:'2px 8px', borderRadius:12 }}>{shopping.filter(i => !i.checked).length} items</span>
              </div>
              <div style={{ padding:'14px 20px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                  {shopping.map(item => (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background: item.checked ? '#F7F4EF' : '#fff', borderRadius:8, border:`1px solid ${item.checked ? '#E2DDD6' : '#E8E3DB'}`, opacity: item.checked ? 0.6 : 1 }}>
                      <input type="checkbox" checked={item.checked} onChange={() => toggleShopping(item.id)}
                        style={{ cursor:'pointer', accentColor:'#C4522A', width:15, height:15, flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:13, color:'#1A1A2E', textDecoration: item.checked ? 'line-through' : 'none' }}>
                        {item.qty !== '1' ? `${item.qty}x ` : ''}{item.item}
                      </span>
                      <span style={{ fontSize:11, color:'#8B8599' }}>from {item.who}</span>
                      <button className="btn-ghost" onClick={() => setShopping(s => s.filter(i => i.id !== item.id))}><X size={12} /></button>
                    </div>
                  ))}
                </div>
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

          {/* RIGHT COLUMN */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* FAMILY SUBMISSIONS */}
            <div className="card">
              <button onClick={() => setSubOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom: subOpen ? '1px solid #F0EDE8' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <MessageSquare size={14} style={{ color:'#C4522A' }} />
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:600, color:'#1A1A2E' }}>Submissions</span>
                  <span style={{ fontSize:11, background: notSubmitted.length>0?'#FEF2F2':'#F0FDF4', color: notSubmitted.length>0?'#DC2626':'#16A34A', border:`1px solid ${notSubmitted.length>0?'#FECACA':'#BBF7D0'}`, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>
                    {MOCK_SUBMISSIONS.length - notSubmitted.length}/{MOCK_SUBMISSIONS.length}
                  </span>
                </div>
                {subOpen ? <ChevronUp size={14} color="#8B8599" /> : <ChevronDown size={14} color="#8B8599" />}
              </button>

              {subOpen && (
                <div style={{ padding:'10px 16px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                  {MOCK_SUBMISSIONS.map(sub => {
                    const member = getMember(sub.member)
                    const hasContent = sub.offEvents?.length > 0 || sub.shopping?.length > 0 || sub.topics?.length > 0
                    return (
                      <div key={sub.member} style={{ padding:'10px 12px', background: sub.notSubmitted ? '#FEF2F2' : '#FAFAF7', borderRadius:9, border:`1px solid ${sub.notSubmitted ? '#FECACA' : '#EDE8E0'}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom: hasContent ? 8 : 0 }}>
                          <span style={{ width:22, height:22, borderRadius:'50%', background:member?.color, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {member?.name[0]}
                          </span>
                          <span style={{ fontSize:13, fontWeight:600, color:'#1A1A2E', flex:1 }}>{member?.name}</span>
                          {sub.notSubmitted
                            ? <span className="tag" style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}>Not submitted</span>
                            : sub.allGood
                              ? <span className="tag" style={{ background:'#F0FDF4', color:'#16A34A', border:'1px solid #BBF7D0' }}>All good</span>
                              : <span style={{ fontSize:11, color:'#8B8599' }}>{sub.submittedAt}</span>
                          }
                        </div>

                        {/* Off-calendar events */}
                        {sub.offEvents?.map((evt, i) => (
                          <div key={i} style={{ marginTop:6, padding:'7px 9px', background:'#fff', borderRadius:6, border:'1px solid #E8E3DB' }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#1A1A2E' }}>{evt.what}</div>
                            <div style={{ fontSize:11, color:'#8B8599', marginTop:1 }}>{evt.day} · {evt.time} · {evt.where}</div>
                            {evt.needsRide && (
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:5 }}>
                                <span style={{ fontSize:11, color:'#D97706', fontWeight:600 }}>🚗 Needs a ride</span>
                                <button onClick={() => addToCalendar(evt, evt.day)}
                                  style={{ fontSize:11, color:'#C4522A', background:'none', border:'1px solid #C4522A', borderRadius:5, padding:'2px 8px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                                  + Add to calendar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Topics */}
                        {sub.topics?.map((t, i) => (
                          <div key={i} style={{ marginTop:5, fontSize:12, color:'#4A4A5A', padding:'5px 8px', background:'#F0EDE8', borderRadius:5 }}>
                            💬 {t}
                          </div>
                        ))}

                        {/* Unavailable days (adults) */}
                        {sub.unavailable?.length > 0 && (
                          <div style={{ marginTop:5, fontSize:12, color:'#DC2626', padding:'5px 8px', background:'#FEF2F2', borderRadius:5 }}>
                            ✗ Out: {sub.unavailable.join(', ')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* MEETING AGENDA */}
            <div className="card">
              <div style={{ padding:'14px 18px', borderBottom:'1px solid #F0EDE8', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:15 }}>📋</span>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:600, color:'#1A1A2E' }}>Agenda</span>
                <span style={{ fontSize:11, background:'#F0EDE8', color:'#8B8599', padding:'2px 7px', borderRadius:10 }}>{agenda.length}</span>
              </div>
              <div style={{ padding:'12px 16px' }}>
                {agenda.map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', marginBottom:5, background:'#F7F4EF', borderRadius:7 }}>
                    <span style={{ fontSize:12, color:'#C4522A', fontWeight:700, minWidth:18 }}>{i+1}.</span>
                    <span style={{ fontSize:13, color:'#1A1A2E', flex:1 }}>{item}</span>
                    <button className="btn-ghost" onClick={() => setAgenda(a => a.filter((_,j) => j !== i))}><X size={12} /></button>
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

            {/* CONFIRM & SEND */}
            <div style={{ background:'linear-gradient(135deg,#1A1A2E,#2D2D4A)', borderRadius:12, padding:20, color:'#fff' }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700, marginBottom:6 }}>Ready to confirm?</div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.5, marginBottom:16 }}>
                This will email everyone the final plan, send calendar invites to drivers, and update the live plan page.
                {gaps.length > 0 && <span style={{ color:'#FCD34D' }}> {gaps.length} transport gap{gaps.length>1?'s':''} still open.</span>}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {[
                  { icon:<Mail size={13}/>,     text:'Email final plan to all 8 members' },
                  { icon:<Calendar size={13}/>,  text:'Calendar invites to assigned drivers' },
                  { icon:<Send size={13}/>,       text:'Text everyone the live plan link' },
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'rgba(255,255,255,0.6)' }}>
                    <span style={{ color:'#4ADE80', flexShrink:0 }}>{item.icon}</span> {item.text}
                  </div>
                ))}
              </div>
              <button onClick={handleConfirm} disabled={sending}
                style={{ width:'100%', background:'#C4522A', color:'#fff', border:'none', borderRadius:9, padding:'13px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {sending
                  ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> Sending…</>
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
