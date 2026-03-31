// @crumb x-oauth-callback
// API | OAuth callback | PKCE authorization code exchange
// why: Receive X/Twitter OAuth2 PKCE authorization code, exchange for tokens, store encrypted credentials in distribution_accounts
// in:[code:string, state:string via query params] out:[redirect to /accounts?success=x] err:[redirect to /accounts?error=*]
// hazard: PKCE uses plain challenge (code_verifier == state string) matching the adapter's current simplified implementation
// hazard: Service client bypasses RLS; user_id is extracted from cookie payload, not from an authenticated session
// hazard: X API v2 tokens have short expiry (~2h); refresh_token must be stored for offline.access scope to work
// edge:../../../../../infrastructure/distribution/platforms/x.adapter.ts -> CALLS exchangeCode
// edge:../../../../../infrastructure/supabase/repositories/distribution-account.repo.ts -> MUTATES
// edge:../../../../../lib/token-encryption.ts -> USES encryptToken
// prompt: Upgrade to S256 PKCE when adapter is updated; validate state expiry; add /me lookup to get real username

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { XAdapter } from '@/infrastructure/distribution/platforms/x.adapter'
import { createServiceClient } from '@/infrastructure/supabase/client'
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo'
import { encryptToken } from '@/lib/token-encryption'

/**
 * GET /api/webhooks/x/callback
 *
 * X redirects here after the user grants (or denies) access.
 * Query params: code, state
 *
 * Flow:
 *   1. Verify state matches the value stored in the oauth_state cookie (CSRF)
 *   2. Extract user_id and code_verifier from the state cookie payload
 *   3. Exchange code for tokens via XAdapter.exchangeCode()
 *      (PKCE: the adapter uses the state string as the code_verifier)
 *   4. Look up the user's X profile to get their username
 *   5. Store encrypted tokens in distribution_accounts (repo handles encryption)
 *   6. Redirect to /accounts?success=x
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
    const storedStateCookie = cookieStore.get('oauth_state_x')

    if (!storedStateCookie) {
      return NextResponse.redirect(
        new URL('/accounts?error=state_missing', request.url),
      )
    }

    let cookiePayload: { state: string; userId: string; reconnectAccountId?: string | null }
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

    // 2. Exchange authorization code for OAuth tokens.
    //    The XAdapter uses the state string as the PKCE code_verifier (plain method)
    //    so the state value passed to getAuthUrl() is the code_challenge = code_verifier.
    const adapter = new XAdapter()
    const tokens = await adapter.exchangeCode(code)

    // 3. Look up the user's X profile to get username and external ID
    let accountName = 'X Account'
    let externalAccountId = ''
    let username = ''

    const profileRes = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })

    if (profileRes.ok) {
      const profileData = await profileRes.json()
      const user = profileData.data ?? {}
      externalAccountId = user.id ?? ''
      username = user.username ?? ''
      accountName = user.name || username || 'X Account'
    }

    // 4. Persist the account. The repo's encryptMetadata helper encrypts
    //    access_token and refresh_token fields automatically.
    const supabase = createServiceClient()
    const { reconnectAccountId } = cookiePayload

    const encryptedMetadata = {
      access_token: encryptToken(tokens.accessToken),
      refresh_token: tokens.refreshToken ? encryptToken(tokens.refreshToken) : '',
      expires_in: tokens.expiresIn,
      token_type: tokens.tokenType,
      scope: tokens.scope ?? '',
      username,
    }

    if (reconnectAccountId) {
      // Reconnect flow: update existing account with fresh tokens and reset failures
      await supabase
        .from('distribution_accounts')
        .update({
          metadata: encryptedMetadata,
          is_active: true,
          consecutive_failures: 0,
          account_name: accountName,
          external_account_id: externalAccountId,
        })
        .eq('id', reconnectAccountId)
        .eq('user_id', userId)
    } else {
      // New connection flow: create a new account record
      const accountRepo = new DistributionAccountRepo(supabase)
      await accountRepo.create({
        userId,
        platform: 'x',
        accountName,
        externalAccountId,
        metadata: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken ?? '',
          expires_in: tokens.expiresIn,
          token_type: tokens.tokenType,
          scope: tokens.scope ?? '',
          username,
        },
      })
    }

    // 5. Clear the state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL('/accounts?success=x', request.url),
    )
    response.cookies.delete('oauth_state_x')
    return response
  } catch (error) {
    console.error('[x/callback] OAuth exchange failed:', error)
    return NextResponse.redirect(
      new URL('/accounts?error=x_failed', request.url),
    )
  }
}
