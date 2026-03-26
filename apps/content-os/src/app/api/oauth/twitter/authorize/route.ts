import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TwitterAdapter } from '@/lib/platforms/twitter/adapter';
import { generateState } from '@/lib/platforms/twitter/oauth';
import { SCOPES } from '@/lib/platforms/twitter/config';

export async function GET() {
  try {
    const adapter = new TwitterAdapter();
    const state = generateState();
    const { url, codeVerifier } = adapter.getAuthorizationUrlWithPKCE(
      state,
      [...SCOPES],
    );

    const cookieStore = await cookies();

    // Store state for CSRF verification in callback
    cookieStore.set('twitter_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Store PKCE code verifier for token exchange in callback
    cookieStore.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return NextResponse.redirect(url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to initiate Twitter OAuth', detail: message },
      { status: 500 },
    );
  }
}
