import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/admin',           // admin pages perform role checks server-side
  '/api/admin-state',
  '/api/family',
  '/api/calendar',
  '/api/dashboard',
  '/api/photos',
  '/api/plan',
  '/api/submissions',
  '/api/send-forms',
  '/api/confirm',
  '/form',
  '/api/submit',
  '/d/',              // device-token dashboards (no login)
  '/i/',              // device-token input pages (no login)
  '/api/i/',          // device-token data fetches
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
      pathname.startsWith('/_next') || pathname === '/favicon.ico' ||
      pathname === '/') {
    return NextResponse.next()
  }

  const isProtected = pathname.startsWith('/dashboard') ||
                      pathname.startsWith('/profile') ||
                      pathname.startsWith('/manage') ||
                      pathname.startsWith('/api/admin/family') ||
                      pathname.startsWith('/api/admin/projects') ||
                      pathname.startsWith('/api/admin/tasks') ||
                      pathname.startsWith('/api/admin/ideas') ||
                      pathname.startsWith('/api/admin/photos') ||
                      pathname.startsWith('/api/admin/devices')

  if (!isProtected) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
