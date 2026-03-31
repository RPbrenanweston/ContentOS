// @crumb tiktok-oauth-authorize
// API | OAuth initiation | TikTok Login Kit v2
// why: Authenticate user, generate CSRF state, set state cookie, redirect to TikTok authorization page
// in:[authenticated session via Supabase] out:[redirect to TikTok auth URL]
// err:[401 if not signed in, 500 on unexpected failure, redirect to /accounts?error=tiktok_failed]
// hazard: Cookie maxAge (600s) must exceed typical user auth flow time; slow users may timeout
// edge:../../../../../lib/platforms/tiktok/oauth.ts -> CALLS generateState, buildAuthUrl
// edge:../../../../../lib/supabase/server.ts -> READS auth session
// prompt: Add logging for OAuth initiation; track state generation time for expiry debugging

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { generateState, buildAuthUrl } from '@/lib/platforms/tiktok/oauth';

export async function GET() {
  try {
    // Require an authenticated user before starting OAuth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to connect a TikTok account' },
        { status: 401 },
      );
    }

    const state = generateState();
    const url = buildAuthUrl(state);

    const cookieStore = await cookies();

    // Store state + userId as base64 JSON for CSRF verification in callback
    const payload = Buffer.from(
      JSON.stringify({ state, userId: user.id }),
    ).toString('base64');

    cookieStore.set('oauth_state_tiktok', payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('[tiktok/authorize] OAuth initiation failed:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to initiate TikTok OAuth', detail: message },
      { status: 500 },
    );
  }
}
