// @crumb youtube-oauth-callback-route
// ROUTE | GET /api/webhooks/youtube/callback | Completes Google OAuth flow
// why: Handle Google's OAuth redirect: verify CSRF state, exchange code for tokens, fetch channel info, persist encrypted credentials
// in:[code + state query params, oauth_state_youtube cookie] out:[302 redirect to /accounts?connected=youtube]
// err:[Redirects to /accounts?error=youtube_failed on any failure]
// edge:../../../../../lib/platforms/youtube/oauth.ts -> CALLS exchangeCode, getChannel
// edge:../../../../../infrastructure/supabase/client.ts -> CALLS createServiceClient
// edge:../../../../../infrastructure/supabase/repositories/distribution-account.repo.ts -> CALLS DistributionAccountRepo.create

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode, getChannel } from '@/lib/platforms/youtube/oauth';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo';

/**
 * GET /api/webhooks/youtube/callback
 *
 * Google redirects here after the user grants (or denies) access.
 * Query params: code, state
 *
 * Flow:
 *   1. Verify state matches the value stored in the oauth_state_youtube cookie (CSRF)
 *   2. Extract user_id from the state cookie payload
 *   3. Exchange code for tokens via exchangeCode()
 *   4. Fetch YouTube channel info for account name + thumbnail
 *   5. Store encrypted tokens in distribution_accounts
 *   6. Redirect to /accounts?connected=youtube
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
    // 1. CSRF -- verify state matches the cookie written at OAuth initiation
    const cookieStore = await cookies();
    const storedStateCookie = cookieStore.get('oauth_state_youtube');

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

    // 2. Exchange authorization code for OAuth tokens
    const tokens = await exchangeCode(code);

    // 3. Fetch YouTube channel info
    let channelTitle = 'YouTube Channel';
    let channelId = '';
    let thumbnailUrl: string | null = null;

    try {
      const channel = await getChannel(tokens.accessToken);
      channelId = channel.channelId;
      channelTitle = channel.channelTitle;
      thumbnailUrl = channel.thumbnailUrl;
    } catch (err) {
      console.warn('[youtube/callback] Could not fetch channel info:', err);
      // Continue anyway -- tokens are valid, channel info is supplementary
    }

    // 4. Persist the account. The repo's encryptMetadata helper encrypts
    //    access_token and refresh_token fields automatically.
    const supabase = createServiceClient();
    const accountRepo = new DistributionAccountRepo(supabase);

    await accountRepo.create({
      userId,
      platform: 'youtube',
      accountName: channelTitle,
      externalAccountId: channelId,
      profileImageUrl: thumbnailUrl,
      metadata: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? '',
        expires_in: tokens.expiresIn,
        token_type: tokens.tokenType,
        scope: tokens.scope,
        channel_title: channelTitle,
      },
    });

    // 5. Clear the state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL('/accounts?connected=youtube', request.url),
    );
    response.cookies.delete('oauth_state_youtube');
    return response;
  } catch (error) {
    console.error('[youtube/callback] OAuth exchange failed:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=youtube_failed', request.url),
    );
  }
}
