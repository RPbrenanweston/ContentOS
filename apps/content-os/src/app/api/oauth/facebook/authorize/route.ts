// @crumb facebook-oauth-authorize
// API | OAuth initiation | CSRF state cookie
// why: Start Facebook Login OAuth flow — generate state, store in cookie with userId, redirect to Facebook
// in:[authenticated session] out:[redirect to Facebook OAuth dialog] err:[401 if not signed in]
// edge:../../../../../lib/platforms/facebook/oauth.ts -> CALLS generateState
// edge:../../../../../lib/platforms/facebook/config.ts -> READS

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { generateState } from '@/lib/platforms/facebook/oauth';
import { AUTH_URL, SCOPES } from '@/lib/platforms/facebook/config';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to connect a Facebook account' },
        { status: 401 },
      );
    }

    const state = generateState();

    const clientId = process.env.FACEBOOK_APP_ID ?? '';
    const redirectUri =
      process.env.FACEBOOK_REDIRECT_URI ??
      'http://localhost:3000/api/webhooks/facebook/callback';

    const url = new URL(AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', SCOPES.join(','));
    url.searchParams.set('state', state);
    url.searchParams.set('response_type', 'code');

    // Store state + userId as base64 JSON for CSRF verification in callback
    const payload = Buffer.from(
      JSON.stringify({ state, userId: user.id }),
    ).toString('base64');

    const cookieStore = await cookies();
    cookieStore.set('oauth_state_facebook', payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return NextResponse.redirect(url.toString());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to initiate Facebook OAuth', detail: message },
      { status: 500 },
    );
  }
}
