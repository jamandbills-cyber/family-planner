import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// List all photos (admin view, with metadata for delete buttons)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .storage
    .from('family-photos')
    .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const photos = (data ?? [])
    .filter(f => !f.name.startsWith('.'))
    .map(f => {
      const { data: pub } = supabase.storage.from('family-photos').getPublicUrl(f.name)
      return {
        name: f.name,
        url: pub.publicUrl,
        size: f.metadata?.size ?? 0,
        uploadedAt: f.created_at ?? null,
      }
    })
  return NextResponse.json({ photos })
}

// Upload a photo. Expects multipart/form-data with field "file".
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext) ? ext : 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .storage
      .from('family-photos')
      .upload(filename, buffer, {
        contentType: file.type || `image/${safeExt}`,
        upsert: false,
      })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: pub } = supabase.storage.from('family-photos').getPublicUrl(filename)
    return NextResponse.json({ name: filename, url: pub.publicUrl })
  } catch (err: any) {
    console.error('Photo upload error:', err)
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 })
  }
}
