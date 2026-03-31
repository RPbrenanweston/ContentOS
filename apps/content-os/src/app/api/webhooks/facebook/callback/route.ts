// @crumb facebook-oauth-callback
// API | OAuth callback | Token exchange + Page selection
// why: Receive Facebook OAuth code, exchange for long-lived token, discover Pages, store Page credentials
// in:[code:string, state:string via query params] out:[redirect to /accounts?connected=facebook or /accounts/select] err:[redirect to /accounts?error=*]
// hazard: State stored in cookies — missing cookie means CSRF check fails, user must restart OAuth flow
// hazard: Service client bypasses RLS; callback is unauthenticated so we extract user_id from the state token
// hazard: Multi-page users need selection UI via connection_sessions; single-page users auto-connect
// edge:../../../../../lib/platforms/facebook/oauth.ts -> CALLS exchangeCode, exchangeForLongLived, getPages
// edge:../../../../../infrastructure/supabase/client.ts -> USES createServiceClient
// edge:../../../../../infrastructure/supabase/repositories/distribution-account.repo.ts -> MUTATES

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo';
import {
  exchangeCode,
  exchangeForLongLived,
  getPages,
} from '@/lib/platforms/facebook/oauth';

/**
 * GET /api/webhooks/facebook/callback
 *
 * Facebook redirects here after the user grants (or denies) access.
 * Query params: code, state
 *
 * Flow:
 *   1. Verify state matches the value stored in the oauth_state_facebook cookie (CSRF)
 *   2. Exchange code for short-lived user token
 *   3. Exchange short-lived token for long-lived (60-day) user token
 *   4. Fetch user's Facebook Pages
 *   5a. If 1 page: create distribution_account directly and redirect
 *   5b. If multiple pages: store in connection_sessions, redirect to selection UI
 *   6. Store the Page Access Token (not user token) — Page tokens are permanent
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/accounts?error=missing_params', request.url),
    );
  }

  try {
    // 1. CSRF — verify state matches the cookie written at OAuth initiation
    const cookieStore = await cookies();
    const storedStateCookie = cookieStore.get('oauth_state_facebook');

    if (!storedStateCookie) {
      return NextResponse.redirect(
        new URL('/accounts?error=state_missing', request.url),
      );
    }

    let cookiePayload: { state: string; userId: string };
    try {
      cookiePayload = JSON.parse(
        Buffer.from(storedStateCookie.value, 'base64').toString('utf8'),
      );
    } catch {
      return NextResponse.redirect(
        new URL('/accounts?error=state_invalid', request.url),
      );
    }

    if (cookiePayload.state !== state) {
      return NextResponse.redirect(
        new URL('/accounts?error=state_mismatch', request.url),
      );
    }

    const { userId } = cookiePayload;

    // 2. Exchange authorization code for short-lived user token
    const shortLived = await exchangeCode(code);

    // 3. Exchange for long-lived (60-day) user token
    const longLived = await exchangeForLongLived(shortLived.accessToken);

    // 4. Fetch user's Facebook Pages (each has its own permanent Page Access Token)
    const pages = await getPages(longLived.accessToken);

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL('/accounts?error=no_facebook_pages', request.url),
      );
    }

    const supabase = createServiceClient();

    if (pages.length === 1) {
      // 5a. Single page — connect directly
      const page = pages[0];
      const accountRepo = new DistributionAccountRepo(supabase);

      await accountRepo.create({
        userId,
        platform: 'facebook',
        accountName: page.name,
        externalAccountId: page.id,
        profileImageUrl: page.pictureUrl,
        metadata: {
          access_token: page.accessToken,
          page_id: page.id,
          page_name: page.name,
          category: page.category,
          user_token: longLived.accessToken,
          user_token_expires_in: longLived.expiresIn,
        },
      });

      const response = NextResponse.redirect(
        new URL('/accounts?connected=facebook', request.url),
      );
      response.cookies.delete('oauth_state_facebook');
      return response;
    }

    // 5b. Multiple pages — store session for selection UI
    const { data: session, error: sessionError } = await supabase
      .from('connection_sessions')
      .insert({
        user_id: userId,
        platform: 'facebook',
        session_data: {
          pages: pages.map((p) => ({
            id: p.id,
            name: p.name,
            access_token: p.accessToken,
            category: p.category,
            picture_url: p.pictureUrl,
          })),
          user_token: longLived.accessToken,
          user_token_expires_in: longLived.expiresIn,
        },
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min TTL
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('[facebook/callback] Failed to create connection session:', sessionError);
      return NextResponse.redirect(
        new URL('/accounts?error=facebook_failed', request.url),
      );
    }

    const response = NextResponse.redirect(
      new URL(
        `/accounts/select?session=${session.id}&platform=facebook`,
        request.url,
      ),
    );
    response.cookies.delete('oauth_state_facebook');
    return response;
  } catch (error) {
    console.error('[facebook/callback] OAuth exchange failed:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=facebook_failed', request.url),
    );
  }
}
