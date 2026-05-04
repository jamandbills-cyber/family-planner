'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Trash2, ImageIcon, Loader2 } from 'lucide-react'

type Photo = { name: string; url: string; size: number; uploadedAt: string | null }

export default function PhotosClient() {
  const [photos, setPhotos]         = useState<Photo[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/photos')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setPhotos(data.photos ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const upload = async (files: FileList) => {
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/photos', { method: 'POST', body: fd })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? `Failed to upload ${file.name}`)
        }
      }
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const remove = async (name: string) => {
    if (!confirm(`Delete this photo?`)) return
    try {
      const res = await fetch(`/api/admin/photos/${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete')
      }
      setPhotos(p => p.filter(x => x.name !== name))
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: '#F7F4EF',
      minHeight: '100vh',
      padding: '24px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <a href="/manage" style={{ fontSize: 13, color: '#8B8599', textDecoration: 'none' }}>← Back to manage</a>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#1A1A2E', margin: '4px 0 6px' }}>
            Family Photos
          </h1>
          <p style={{ fontSize: 14, color: '#8B8599', margin: 0 }}>
            Photos rotate on the kitchen display. Mixed orientations are letterboxed automatically.
          </p>
        </div>

        <div style={{
          background: '#fff', border: '1px solid #E8E3DB', borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && upload(e.target.files)}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            style={{
              background: '#C4522A', color: '#fff', border: 'none',
              borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: "'DM Sans', sans-serif",
              opacity: uploading ? 0.6 : 1,
            }}>
            {uploading
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
              : <><Upload size={15} /> Upload Photos</>}
          </button>
          {error && (
            <div style={{ marginTop: 10, fontSize: 13, color: '#DC2626' }}>⚠ {error}</div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8B8599' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : photos.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px dashed #DDD8CF', borderRadius: 12,
            padding: 40, textAlign: 'center',
          }}>
            <ImageIcon size={36} style={{ color: '#C4B8A8', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, color: '#8B8599' }}>No photos yet. Upload some above.</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {photos.map(p => (
              <div key={p.name} style={{
                position: 'relative',
                background: '#fff', border: '1px solid #E8E3DB',
                borderRadius: 10, overflow: 'hidden',
                aspectRatio: '4 / 3',
              }}>
                <img src={p.url} alt={p.name} style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                }} />
                <button
                  onClick={() => remove(p.name)}
                  title="Delete"
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    borderRadius: 6, padding: 6, cursor: 'pointer',
                    color: '#fff', display: 'flex', alignItems: 'center',
                  }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
