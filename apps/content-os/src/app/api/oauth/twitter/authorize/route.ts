import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { TwitterAdapter } from '@/lib/platforms/twitter/adapter'
import { generateState } from '@/lib/platforms/twitter/oauth'
import { SCOPES } from '@/lib/platforms/twitter/config'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Require an authenticated user before starting OAuth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to connect an X account' },
        { status: 401 },
      )
    }

    const adapter = new TwitterAdapter()
    const state = generateState()
    const { url, codeVerifier } = adapter.getAuthorizationUrlWithPKCE(
      state,
      [...SCOPES],
    )

    const cookieStore = await cookies()

    // Store state + userId as base64 JSON for CSRF verification in callback.
    // The callback route (webhooks/x/callback) parses this to:
    //   1. Verify state matches the OAuth redirect state param
    //   2. Extract userId so the callback does not need an authenticated session
    const payload = Buffer.from(
      JSON.stringify({ state, userId: user.id }),
    ).toString('base64')

    cookieStore.set('oauth_state_x', payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Store PKCE code verifier separately for token exchange in callback
    cookieStore.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    return NextResponse.redirect(url)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to initiate X OAuth', detail: message },
      { status: 500 },
    )
  }
}
