// @crumb youtube-oauth-authorize-route
// ROUTE | GET /api/oauth/youtube/authorize | Initiates Google OAuth flow
// why: Start YouTube connection by generating CSRF state, storing it in a cookie, and redirecting to Google consent screen
// in:[Authenticated Supabase session] out:[302 redirect to Google OAuth] err:[401 if not signed in, 500 on failure]
// edge:../../../../../lib/platforms/youtube/oauth.ts -> CALLS generateState, buildAuthUrl
// edge:../../../webhooks/youtube/callback/route.ts -> REDIRECTS_TO (via Google)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateState, buildAuthUrl } from '@/lib/platforms/youtube/oauth';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to connect a YouTube account' },
        { status: 401 },
      );
    }

    const state = generateState();
    const url = buildAuthUrl(state);

    const cookieStore = await cookies();

    // Store state + userId as base64 JSON for CSRF verification in callback.
    const payload = Buffer.from(
      JSON.stringify({ state, userId: user.id }),
    ).toString('base64');

    cookieStore.set('oauth_state_youtube', payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return NextResponse.redirect(url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to initiate YouTube OAuth', detail: message },
      { status: 500 },
    );
  }
}
