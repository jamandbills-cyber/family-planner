import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Returns a list of public URLs for all photos in the family-photos bucket.
// Kitchen display polls this and rotates through them.
export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .storage
    .from('family-photos')
    .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    console.error('Photo list error:', error)
    return NextResponse.json({ photos: [] })
  }

  const urls = (data ?? [])
    .filter(f => !f.name.startsWith('.'))
    .map(f => {
      const { data: pub } = supabase
        .storage
        .from('family-photos')
        .getPublicUrl(f.name)
      return pub.publicUrl
    })

  return NextResponse.json({ photos: urls })
}
