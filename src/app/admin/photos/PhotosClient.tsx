'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Trash2, ImageIcon, Loader2 } from 'lucide-react'
import { Alert, Button, Card, EmptyState, IconButton, LoadingState, PageHeader, PageShell } from '@/components/ui'

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
    <PageShell size="wide">
      <PageHeader
        eyebrow={<a href="/manage" style={{ color: 'inherit', textDecoration: 'none' }}>Back to manage</a>}
        title="Family Photos"
        description="Photos rotate on the kitchen display. Mixed orientations are letterboxed automatically."
      />

      <Card style={{ marginBottom: 20 }}>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && upload(e.target.files)}
          />
          <Button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
              : <><Upload size={15} /> Upload Photos</>}
          </Button>
          {error && <Alert tone="danger" style={{ marginTop: 12 }}>{error}</Alert>}
      </Card>

      {loading ? (
        <LoadingState label="Loading photos..." />
      ) : photos.length === 0 ? (
        <EmptyState title="No photos yet">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ImageIcon size={18} /> Upload some above and they will rotate on the kitchen display.
          </div>
        </EmptyState>
      ) : (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {photos.map(p => (
              <div key={p.name} style={{
                position: 'relative',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                aspectRatio: '4 / 3',
              }}>
                <img src={p.url} alt={p.name} style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                }} />
                <IconButton
                  label={`Delete ${p.name}`}
                  onClick={() => remove(p.name)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    borderRadius: 6, padding: 6, cursor: 'pointer',
                    color: '#fff', display: 'flex', alignItems: 'center',
                  }}>
                  <Trash2 size={13} />
                </IconButton>
              </div>
            ))}
        </div>
      )}
    </PageShell>
  )
}
