import 'server-only'

import { NextRequest, NextResponse } from 'next/server'

export function isValidInternalRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authorization = req.headers.get('authorization')
  const internalToken = req.headers.get('x-internal-token')

  return authorization === `Bearer ${secret}` || internalToken === secret
}

export function requireInternalRequest(req: NextRequest): NextResponse | null {
  if (isValidInternalRequest(req)) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
