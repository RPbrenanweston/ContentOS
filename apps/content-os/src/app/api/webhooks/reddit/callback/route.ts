import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCode } from '@/lib/platforms/reddit/oauth'
import { PROFILE_URL } from '@/lib/platforms/reddit/config'
import { createServiceClient } from '@/infrastructure/supabase/client'
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo'

/**
 * GET /api/webhooks/reddit/callback
 *
 * Reddit redirects here after the user grants (or denies) access.
 * Query params: code, state
 *
 * Flow:
 *   1. Verify state matches the value stored in the oauth_state cookie (CSRF)
 *   2. Extract user_id from the state cookie payload
 *   3. Exchange code for tokens via exchangeCode()
 *   4. Fetch Reddit profile for account name
 *   5. Store encrypted tokens in distribution_accounts
 *   6. Redirect to /accounts?connected=reddit
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
    const storedStateCookie = cookieStore.get('oauth_state_reddit')

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
    const tokens = await exchangeCode(code)

    // 3. Fetch Reddit profile for account name and external ID
    const profileRes = await fetch(PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'User-Agent': 'ContentOS/1.0',
      },
    })

    let username = 'Reddit Account'
    let externalAccountId = ''
    let avatarUrl: string | null = null

    if (profileRes.ok) {
      const profile = await profileRes.json()
      externalAccountId = profile.id ?? ''
      username = profile.name ?? 'Reddit Account'
      avatarUrl = profile.icon_img?.split('?')[0] ?? null
    }

    // 4. Persist the account. The repo's encryptMetadata helper encrypts
    //    access_token and refresh_token fields automatically.
    const supabase = createServiceClient()
    const accountRepo = new DistributionAccountRepo(supabase)

    await accountRepo.create({
      userId,
      platform: 'reddit',
      accountName: username,
      externalAccountId,
      profileImageUrl: avatarUrl,
      metadata: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? '',
        expires_in: tokens.expiresIn,
        token_type: tokens.tokenType,
        scope: tokens.scope,
        username,
      },
    })

    // 5. Clear the state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL('/accounts?connected=reddit', request.url),
    )
    response.cookies.delete('oauth_state_reddit')
    return response
  } catch (error) {
    console.error('[reddit/callback] OAuth exchange failed:', error)
    return NextResponse.redirect(
      new URL('/accounts?error=reddit_failed', request.url),
    )
  }
}
