'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Member = { id: string; display_name: string; color: string | null; type?: string | null }

export default function PickerPage() {
  return (
    <Suspense fallback={<LoadingFrame />}>
      <PickerContent />
    </Suspense>
  )
}

function LoadingFrame() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F4EF',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#8B8599', fontSize: 14,
    }}>
      Loading…
    </div>
  )
}

function PickerContent() {
  const params = useSearchParams()
  const token = params.get('d')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setError('No device token'); setLoading(false); return }
    const load = async () => {
      try {
        const res = await fetch(`/api/i/family?d=${encodeURIComponent(token)}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? 'Failed to load')
        setMembers(data.members ?? [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F4EF',
      fontFamily: "'DM Sans', sans-serif",
      padding: 20,
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 32, fontWeight: 700, color: '#1A1A2E',
          margin: '12px 0 6px',
          textAlign: 'center',
        }}>
          Who's this for?
        </h1>
        <p style={{
          fontSize: 14, color: '#8B8599',
          margin: '0 0 24px', textAlign: 'center',
        }}>
          Tap a name to add or check off tasks.
        </p>

        {error && (
          <div style={{
            padding: '12px 16px', background: '#FEF2F2',
            border: '1px solid #FECACA', borderRadius: 10,
            color: '#DC2626', fontSize: 14, marginBottom: 16,
          }}>
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8B8599' }}>
            Loading…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.length === 0 && (
              <div style={{ padding: '18px', background: '#fff', border: '1px solid #E8E3DB', borderRadius: 14, color: '#8B8599', textAlign: 'center', fontSize: 14 }}>
                No family members are available for this device.
              </div>
            )}
            {members.map(m => (
              <a key={m.id} href={`/i/${m.id}?d=${encodeURIComponent(token ?? '')}`}
                style={{
                  display: 'flex', alignItems: 'center',
                  background: '#fff', border: '1px solid #E8E3DB',
                  borderRadius: 14,
                  padding: '18px 18px',
                  textDecoration: 'none',
                  minHeight: 64,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                <div style={{
                  width: 8,
                  alignSelf: 'stretch',
                  background: m.color ?? '#888780',
                  borderRadius: 4,
                  marginRight: 16,
                }} />
                <span style={{
                  fontSize: 22, fontWeight: 600, color: '#1A1A2E',
                  flex: 1,
                }}>
                  {m.display_name}
                </span>
                <span style={{
                  fontSize: 22, color: '#C4B8A8',
                }}>›</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
