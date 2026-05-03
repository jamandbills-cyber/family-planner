import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Paths that should NEVER hit auth middleware
// Existing app routes stay open — only new dashboard/profile routes are protected
const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/admin',           // existing NextAuth-protected admin pages
  '/api/admin-state', // existing
  '/api/family',      // existing (now reads from supabase, still public-ish)
  '/api/calendar',    // existing
  '/api/send-forms',  // existing
  '/api/confirm',     // existing
  '/form',            // existing tokenized forms
  '/api/submit',      // existing
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
      pathname.startsWith('/_next') || pathname === '/favicon.ico' ||
      pathname === '/') {
    return NextResponse.next()
  }

  // Only protect new routes; everything else falls through unchanged
  const isProtected = pathname.startsWith('/dashboard') ||
                      pathname.startsWith('/profile') ||
                      pathname.startsWith('/api/tasks') ||
                      pathname.startsWith('/api/projects') ||
                      pathname.startsWith('/api/ideas') ||
                      pathname.startsWith('/api/admin/family')

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
