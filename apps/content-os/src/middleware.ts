// @crumb auth-middleware
// SEC | Authentication | API protection
// why: Protect all /api/* routes by verifying Supabase JWT from Authorization header or cookies, forwarding validated user ID to downstream handlers
// in:[NextRequest with Authorization header or Supabase auth cookies] out:[NextResponse with x-user-id header or 401 JSON] err:[InvalidTokenError|MissingTokenError|SupabaseAuthError]
// hazard: Token validation must use Supabase's own auth.getUser() — never decode JWT client-side or trust unverified claims
// hazard: Skipping /api/health is intentional; adding other skip paths requires explicit review
// edge:./infrastructure/supabase/client.ts -> RELATES (browser/server/service client factories)
// edge:./app/api/content/route.ts -> SERVES (protected downstream route)
// prompt: Monitor for auth bypass attempts; audit any new /api/health-style skips; consider rate limiting 401 responses

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip health check — no auth required for liveness probes
  if (request.nextUrl.pathname === '/api/health') {
    return NextResponse.next()
  }

  // Only protect API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Build mutable request headers — these get forwarded to route handlers
  const requestHeaders = new Headers(request.headers)

  // Build a mutable response so cookie mutations from createServerClient are applied
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // createServerClient from @supabase/ssr handles cookie-based session refresh
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Update cookies on the request headers (for downstream route handlers)
        cookiesToSet.forEach(({ name, value }) => {
          requestHeaders.set(`cookie-${name}`, value)
        })
        // Also update cookies on the response (for the browser)
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Prefer explicit Authorization header (API clients, service-to-service)
  // Fall back to cookie-based session (browser clients)
  const authHeader = request.headers.get('authorization')
  let user = null

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data } = await supabase.auth.getUser(token)
    user = data.user
  } else {
    // Cookie-based: session already loaded via createServerClient above
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Valid authentication required' },
      { status: 401 }
    )
  }

  // Stamp the verified user ID on the FORWARDED REQUEST headers so downstream
  // route handlers can read it via request.headers.get('x-user-id').
  // BUG FIX: Previously this was set on response.headers, which only sends the
  // header back to the browser — route handlers never saw it, causing userId to
  // be empty string and all writes to fail silently.
  requestHeaders.set('x-user-id', user.id)

  // Rebuild the response with the updated request headers
  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Carry over any cookies that were set during session refresh
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value)
  })

  return finalResponse
}

export const config = {
  matcher: '/api/:path*',
}
