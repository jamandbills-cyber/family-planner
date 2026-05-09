import 'server-only'

import type { NextRequest } from 'next/server'

export function getAppUrl(req?: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  if (req) return req.nextUrl.origin
  throw new Error('NEXTAUTH_URL is required when request origin is unavailable')
}
