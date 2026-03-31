// @crumb instagram-oauth-callback
// API | OAuth callback | Token exchange and account creation
// why: Receive Instagram OAuth2 authorization code, exchange for short-lived token, swap for 60-day long-lived token, fetch profile, store encrypted credentials
// in:[code:string, state:string via query params] out:[redirect to /accounts?connected=instagram] err:[redirect to /accounts?error=instagram_failed]
// hazard: State stored in cookies — missing cookie means CSRF check fails, user must restart OAuth flow
// hazard: Service client bypasses RLS; callback is unauthenticated so we extract user_id from the state token
// hazard: Short-lived token expires in ~1 hour; must exchange for long-lived before any delay
// edge:../../../../../lib/platforms/instagram/oauth.ts -> CALLS exchangeCode, exchangeForLongLived, getProfile
// edge:../../../../../infrastructure/supabase/repositories/distribution-account.repo.ts -> MUTATES
// edge:../../../../../infrastructure/supabase/client.ts -> CALLS createServiceClient
// prompt: Add idempotency check for duplicate callbacks; validate decoded state before use

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/infrastructure/supabase/client'
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo'
import {
  exchangeCode,
  exchangeForLongLived,
  getProfile,
} from '@/lib/platforms/instagram/oauth'

/**
 * GET /api/webhooks/instagram/callback
 *
 * Instagram redirects here after the user grants (or denies) access.
 * Query params: code, state
 *
 * Flow:
 *   1. Verify state matches the value stored in the oauth_state_instagram cookie (CSRF)
 *   2. Extract user_id from the state cookie payload
 *   3. Exchange code for short-lived token
 *   4. Exchange short-lived token for 60-day long-lived token
 *   5. Fetch user profile (id, username, profile_picture_url)
 *   6. Store encrypted tokens in distribution_accounts
 *   7. Redirect to /accounts?connected=instagram
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/accounts?error=missing_params', request.url),
    )
  }

  try {
    // 1. CSRF — verify state matches the cookie written at OAuth initiation
    const cookieStore = await cookies()
    const storedStateCookie = cookieStore.get('oauth_state_instagram')

    if (!storedStateCookie) {
      return NextResponse.redirect(
        new URL('/accounts?error=state_missing', request.url),
      )
    }

    let cookiePayload: { state: string; userId: string }
    try {
      cookiePayload = JSON.parse(
        Buffer.from(storedStateCookie.value, 'base64').toString('utf8'),
      )
    } catch {
      return NextResponse.redirect(
        new URL('/accounts?error=state_invalid', request.url),
      )
    }

    if (cookiePayload.state !== state) {
      return NextResponse.redirect(
        new URL('/accounts?error=state_mismatch', request.url),
      )
    }

    const { userId } = cookiePayload

    // 2. Exchange authorization code for short-lived token
    const shortLived = await exchangeCode(code)

    // 3. Exchange short-lived token for 60-day long-lived token
    const longLived = await exchangeForLongLived(shortLived.accessToken)

    // 4. Fetch the user's Instagram profile
    const profile = await getProfile(longLived.accessToken)

    // 5. Persist the account. The repo's encryptMetadata helper encrypts
    //    access_token fields automatically.
    const supabase = createServiceClient()
    const accountRepo = new DistributionAccountRepo(supabase)

    await accountRepo.create({
      userId,
      platform: 'instagram',
      accountName: profile.username || 'Instagram Account',
      externalAccountId: profile.id,
      profileImageUrl: profile.profilePictureUrl ?? undefined,
      metadata: {
        access_token: longLived.accessToken,
        expires_in: longLived.expiresIn,
        instagram_user_id: shortLived.userId,
        username: profile.username,
      },
    })

    // 6. Clear the state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL('/accounts?connected=instagram', request.url),
    )
    response.cookies.delete('oauth_state_instagram')
    return response
  } catch (error) {
    console.error('[instagram/callback] OAuth exchange failed:', error)
    return NextResponse.redirect(
      new URL('/accounts?error=instagram_failed', request.url),
    )
  }
}
