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

    // Get an access token — use admin session if available,
    // otherwise use a service account (added later with Twilio)
    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken

    if (!accessToken) {
      // In production: use a stored refresh token from the admin
      // For now: still save but log the issue
      console.warn('No access token for Sheets write — submission not persisted')
      return NextResponse.json({ success: true, persisted: false })
    }

    // Validate the token
    const tokenRecord = await getToken(accessToken, token)
    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    if (tokenRecord.formType !== 'kid') {
      return NextResponse.json({ error: 'Wrong form type for this token' }, { status: 401 })
    }

    // Save the submission
    await saveSubmission(
      accessToken,
      tokenRecord.memberId,
      'kid',
      tokenRecord.weekStart,
      payload
    )

    return NextResponse.json({ success: true, persisted: true })
  } catch (err) {
    console.error('Kid submission error:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
