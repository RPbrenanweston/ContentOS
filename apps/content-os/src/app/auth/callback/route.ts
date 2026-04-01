import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /auth/callback
 *
 * Handles the redirect from a Supabase magic link.
 * Exchanges the auth code for a session, sets cookies,
 * then redirects to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) {
    // No code — redirect to login with error
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Code exchange failed:', error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`);
  }

  return response;
}
