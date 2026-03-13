import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Ignore static assets and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.match(/\.(.*)$/)
  ) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect paths: if not logged in, they can't access /settings or /admin
  const isProtectedPath = ['/settings', '/admin', '/messages'].some(path => request.nextUrl.pathname.startsWith(path))
  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Profile Setup Enforcement:
  // If user is logged in, and NOT currently on /setup-profile or /login or /auth
  const isSetupPath = request.nextUrl.pathname.startsWith('/setup-profile')
  const isAuthPath = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth')
  
  if (user && !isSetupPath && !isAuthPath) {
    // Check if profile exists using service role or standard client?
    // Middleware can't use service role easily, so we check using anon key.
    // If the user hasn't set up their profile, the profile select will return null.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', user.id)
      .single()

    // If profile is missing or display_name is empty, force redirect 
    if (!profile || !profile.display_name) {
      return NextResponse.redirect(new URL('/setup-profile', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
