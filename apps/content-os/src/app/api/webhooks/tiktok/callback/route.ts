// @crumb tiktok-oauth-callback
// API | OAuth callback | TikTok authorization code exchange
// why: Receive TikTok OAuth authorization code, exchange for tokens, fetch user info, store encrypted credentials
// in:[code:string, state:string via query params] out:[redirect to /accounts?connected=tiktok]
// err:[redirect to /accounts?error=tiktok_failed on any failure]
// hazard: Service client bypasses RLS; user_id extracted from cookie payload, not authenticated session
// hazard: TikTok access tokens expire in 24h; refresh_token must be persisted for token renewal
// edge:../../../../../lib/platforms/tiktok/oauth.ts -> CALLS exchangeCode, getUserInfo
// edge:../../../../../infrastructure/supabase/repositories/distribution-account.repo.ts -> MUTATES
// edge:../../../../../infrastructure/supabase/client.ts -> READS createServiceClient
// prompt: Add error categorization for user-facing messages; log token scopes for audit

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, getUserInfo } from '@/lib/platforms/tiktok/oauth';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo';

/**
 * GET /api/webhooks/tiktok/callback
 *
 * TikTok redirects here after the user grants (or denies) access.
 * Query params: code, state
 *
 * Flow:
 *   1. Verify state matches the value stored in the oauth_state_tiktok cookie (CSRF)
 *   2. Extract user_id from the state cookie payload
 *   3. Exchange code for tokens via TikTok Login Kit v2
 *   4. Fetch user profile for account_name and avatar
 *   5. Store encrypted tokens in distribution_accounts
 *   6. Redirect to /accounts?connected=tiktok
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/accounts?error=tiktok_failed', request.url),
    );
  }

  try {
    // 1. CSRF -- verify state matches the cookie written at OAuth initiation
    const cookieStore = await cookies();
    const storedStateCookie = cookieStore.get('oauth_state_tiktok');

    if (!storedStateCookie) {
      return NextResponse.redirect(
        new URL('/accounts?error=tiktok_failed', request.url),
      );
    }

    let cookiePayload: { state: string; userId: string };
    try {
      cookiePayload = JSON.parse(
        Buffer.from(storedStateCookie.value, 'base64').toString('utf8'),
      );
    } catch {
      return NextResponse.redirect(
        new URL('/accounts?error=tiktok_failed', request.url),
      );
    }

    if (cookiePayload.state !== state) {
      return NextResponse.redirect(
        new URL('/accounts?error=tiktok_failed', request.url),
      );
    }

    const { userId } = cookiePayload;

    // 2. Exchange authorization code for OAuth tokens
    const tokens = await exchangeCode(code);

    // 3. Fetch user profile for display name and avatar
    let accountName = 'TikTok Account';
    let avatarUrl: string | undefined;

    try {
      const userInfo = await getUserInfo(tokens.accessToken);
      accountName = userInfo.displayName || 'TikTok Account';
      avatarUrl = userInfo.avatarUrl || undefined;
    } catch (err) {
      console.warn('[tiktok/callback] Failed to fetch user info:', err);
      // Non-fatal: proceed with default account name
    }

    // 4. Persist the account. The repo encrypts access_token and refresh_token automatically.
    const supabase = createServiceClient();
    const accountRepo = new DistributionAccountRepo(supabase);

    await accountRepo.create({
      userId,
      platform: 'tiktok',
      accountName,
      externalAccountId: tokens.openId,
      profileImageUrl: avatarUrl,
      metadata: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        refresh_expires_in: tokens.refreshExpiresIn,
        scope: tokens.scope,
        open_id: tokens.openId,
      },
    });

    // 5. Clear the state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL('/accounts?connected=tiktok', request.url),
    );
    response.cookies.delete('oauth_state_tiktok');
    return response;
  } catch (error) {
    console.error('[tiktok/callback] OAuth exchange failed:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=tiktok_failed', request.url),
    );
  }
}
