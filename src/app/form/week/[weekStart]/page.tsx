'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

type PersonLink = {
  id: string
  name: string
  type: 'adult' | 'child'
  color: string
  url: string
  submitted: boolean
}

function weekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`)
  if (Number.isNaN(start.getTime())) return 'this week'
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export default function SharedPlanningWeekPage() {
  const params = useParams()
  const router = useRouter()
  const weekStart = params?.weekStart as string
  const [people, setPeople] = useState<PersonLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/form/week/${weekStart}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not load planning links')
        setPeople(data.people ?? [])
      } catch (err: any) {
        setError(err.message ?? 'This planning link is not available.')
      } finally {
        setLoading(false)
      }
    }
    if (weekStart) load()
  }, [weekStart])

  if (loading) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: '100vh', background: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B8599' }}>
        Loading family planner...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: '100vh', background: '#F7F4EF' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>
      <div style={{ background: '#1A1A2E', color: '#fff', padding: '28px 20px 34px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#7070A0', textTransform: 'uppercase', marginBottom: 8 }}>
            Family Weekly Planning
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, marginBottom: 6 }}>
            Choose your name
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
            {weekLabel(weekStart)}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '22px 16px 48px' }}>
        {error ? (
          <div style={{ background: '#fff', border: '1px solid #E8E3DB', borderRadius: 14, padding: 24, color: '#DC2626', textAlign: 'center' }}>
            {error}
          </div>
        ) : people.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E8E3DB', borderRadius: 14, padding: 24, color: '#8B8599', textAlign: 'center' }}>
            No form links are ready yet. Ask Justin to generate this week's planning link.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {people.map(person => (
              <button
                key={person.id}
                onClick={() => router.push(person.url)}
                style={{
                  width: '100%',
                  background: '#fff',
                  border: '1px solid #E8E3DB',
                  borderLeft: `6px solid ${person.color}`,
                  borderRadius: 14,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontFamily: "'DM Sans',sans-serif",
                  textAlign: 'left',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <span>
                  <span style={{ display: 'block', fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}>{person.name}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#8B8599', marginTop: 3 }}>
                    {person.type === 'adult' ? 'Adult form' : 'Kid form'}
                  </span>
                </span>
                {person.submitted ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#16A34A', fontSize: 12, fontWeight: 700 }}>
                    <CheckCircle size={14} /> Submitted
                  </span>
                ) : (
                  <span style={{ color: '#C4522A', fontSize: 13, fontWeight: 700 }}>Open</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
