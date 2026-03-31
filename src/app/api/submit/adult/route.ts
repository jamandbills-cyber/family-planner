import { NextRequest, NextResponse } from 'next/server'
import { getToken, saveSubmission } from '@/lib/sheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, payload } = body

    if (!token || !payload) {
      return NextResponse.json({ error: 'Missing token or payload' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken

    if (!accessToken) {
      console.warn('No access token for Sheets write — submission not persisted')
      return NextResponse.json({ success: true, persisted: false })
    }

    const tokenRecord = await getToken(accessToken, token)
    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    if (tokenRecord.formType !== 'adult') {
      return NextResponse.json({ error: 'Wrong form type for this token' }, { status: 401 })
    }

    await saveSubmission(
      accessToken,
      tokenRecord.memberId,
      'adult',
      tokenRecord.weekStart,
      payload
    )

    return NextResponse.json({ success: true, persisted: true })
  } catch (err) {
    console.error('Adult submission error:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
