import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const supabase = getSupabaseAdmin()
  const { data: device } = await supabase
    .from('device_tokens')
    .select('view_type, member_id')
    .eq('token', token)
    .maybeSingle()

  const origin = req.nextUrl.origin
  let target: string
  if (device?.view_type === 'personal' && device.member_id) {
    target = `${origin}/i/${device.member_id}?d=${token}`
  } else {
    target = `${origin}/i/picker?d=${token}`
  }

  try {
    const png = await QRCode.toBuffer(target, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 600,
      color: { dark: '#1A1A2E', light: '#FFFFFF' },
    })
    // Convert Buffer → Uint8Array; Buffer isn't valid BodyInit in Next 15 typings
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('QR generation failed:', err)
    return NextResponse.json({ error: 'QR generation failed' }, { status: 500 })
  }
}
