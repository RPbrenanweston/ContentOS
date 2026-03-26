import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { LinkedInAdapter } from '@/lib/platforms/linkedin/adapter';
import { generateState } from '@/lib/platforms/linkedin/oauth';
import { SCOPES } from '@/lib/platforms/linkedin/config';

export async function GET() {
  try {
    const adapter = new LinkedInAdapter();
    const state = generateState();
    const url = adapter.getAuthorizationUrl(state, [...SCOPES]);

    const cookieStore = await cookies();

    // Store state for CSRF verification in callback
    cookieStore.set('linkedin_oauth_state', state, {
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
      { error: 'Failed to initiate LinkedIn OAuth', detail: message },
      { status: 500 },
    );
  }
}
