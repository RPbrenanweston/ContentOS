// @crumb linkedin-oauth-callback
// API | OAuth callback | Authorization code exchange
// why: Receive LinkedIn OAuth2 authorization code, exchange for tokens, encrypt and store in distribution_accounts
// in:[code:string, state:string via query params] out:[redirect to /accounts?success=linkedin] err:[redirect to /accounts?error=*]
// hazard: State stored in cookies — missing cookie means CSRF check fails, user must restart OAuth flow
// hazard: Service client bypasses RLS; callback is unauthenticated so we extract user_id from the state token
// hazard: No rate limiting on callback endpoint — repeated requests with valid codes could exhaust LinkedIn token quota
// edge:../../../../../infrastructure/distribution/platforms/linkedin.adapter.ts -> CALLS exchangeCode
// edge:../../../../../infrastructure/supabase/repositories/distribution-account.repo.ts -> MUTATES
// edge:../../../../../lib/token-encryption.ts -> USES encryptToken
// prompt: Add state expiry (short TTL cookie); validate decoded state before use; add idempotency check for duplicate callbacks

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LinkedInAdapter } from '@/infrastructure/distribution/platforms/linkedin.adapter'
import { createServiceClient } from '@/infrastructure/supabase/client'
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo'

/**
 * GET /api/webhooks/linkedin/callback
 *
 * LinkedIn redirects here after the user grants (or denies) access.
 * Query params: code, state
 *
 * Flow:
 *   1. Verify state matches the value stored in the oauth_state cookie (CSRF)
 *   2. Extract user_id from the state cookie payload
 *   3. Exchange code for tokens via LinkedInAdapter.exchangeCode()
 *   4. Store encrypted tokens in distribution_accounts (repo handles encryption)
 *   5. Redirect to /accounts?success=linkedin
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
    const storedStateCookie = cookieStore.get('oauth_state_linkedin')

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

    // 2. Exchange authorization code for OAuth tokens
    const adapter = new LinkedInAdapter()
    const tokens = await adapter.exchangeCode(code)

    // 3. Retrieve the user's LinkedIn profile name for account_name
    //    We re-use the userinfo endpoint that the adapter already calls internally.
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })

    let accountName = 'LinkedIn Account'
    let externalAccountId = ''

    if (profileRes.ok) {
      const profile = await profileRes.json()
      externalAccountId = profile.sub ?? ''
      accountName =
        [profile.given_name, profile.family_name].filter(Boolean).join(' ') ||
        profile.email ||
        'LinkedIn Account'
    }

    // 4. Persist the account. The repo's encryptMetadata helper encrypts
    //    access_token and refresh_token fields automatically.
    const supabase = createServiceClient()
    const accountRepo = new DistributionAccountRepo(supabase)

    await accountRepo.create({
      userId,
      platform: 'linkedin',
      accountName,
      externalAccountId,
      metadata: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? '',
        expires_in: tokens.expiresIn,
        token_type: tokens.tokenType,
        scope: tokens.scope ?? '',
      },
    })

    // 5. Clear the state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL('/accounts?success=linkedin', request.url),
    )
    response.cookies.delete('oauth_state_linkedin')
    return response
  } catch (error) {
    console.error('[linkedin/callback] OAuth exchange failed:', error)
    return NextResponse.redirect(
      new URL('/accounts?error=linkedin_failed', request.url),
    )
  }
}
