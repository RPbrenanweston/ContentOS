import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCode, exchangeForLongLived } from '@/lib/platforms/threads/oauth'
import { SCOPES } from '@/lib/platforms/threads/config'
import { createServiceClient } from '@/infrastructure/supabase/client'
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo'

/**
 * GET /api/webhooks/threads/callback
 *
 * Threads redirects here after the user grants (or denies) access.
 * Query params: code, state
 *
 * Flow:
 *   1. Verify state matches the value stored in the oauth_state_threads cookie (CSRF)
 *   2. Extract user_id from the state cookie payload
 *   3. Exchange code for short-lived token
 *   4. Exchange short-lived token for long-lived token (~60 days)
 *   5. Fetch Threads profile for display name and username
 *   6. Store encrypted tokens in distribution_accounts
 *   7. Redirect to /accounts?connected=threads
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
    const storedStateCookie = cookieStore.get('oauth_state_threads')

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

    // 2. Exchange authorization code for short-lived token (~1 hour)
    const { shortAccessToken } = await exchangeCode(code)

    // 3. Exchange short-lived token for long-lived token (~60 days)
    const { accessToken, expiresIn } = await exchangeForLongLived(shortAccessToken)

    // 4. Fetch Threads profile using the long-lived token
    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${accessToken}`,
    )

    let externalAccountId = ''
    let username = ''
    let displayName = ''
    let avatarUrl: string | undefined

    if (profileRes.ok) {
      const profile = await profileRes.json()
      externalAccountId = profile.id ?? ''
      username = profile.username ?? ''
      displayName = profile.name ?? ''
      avatarUrl = profile.threads_profile_picture_url ?? undefined
    }

    const accountName = displayName || username || 'Threads Account'

    // 5. Persist the account. The repo's encryptMetadata helper encrypts
    //    access_token fields automatically.
    const supabase = createServiceClient()
    const accountRepo = new DistributionAccountRepo(supabase)

    await accountRepo.create({
      userId,
      platform: 'threads',
      accountName,
      externalAccountId,
      profileImageUrl: avatarUrl,
      metadata: {
        access_token: accessToken,
        expires_in: expiresIn,
        scope: SCOPES.join(','),
        username,
      },
    })

    // 6. Clear the state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL('/accounts?connected=threads', request.url),
    )
    response.cookies.delete('oauth_state_threads')
    return response
  } catch (error) {
    console.error('[threads/callback] OAuth exchange failed:', error)
    return NextResponse.redirect(
      new URL('/accounts?error=threads_failed', request.url),
    )
  }
}
