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

  // Build a mutable response so cookie mutations from createServerClient are applied
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })

  // createServerClient from @supabase/ssr handles cookie-based session refresh
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
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

  // Stamp the verified user ID so downstream route handlers don't re-verify
  response.headers.set('x-user-id', user.id)
  return response
}

export const config = {
  matcher: '/api/:path*',
}
