import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LinkedInAdapter } from '@/lib/platforms/linkedin/adapter'
import { generateState } from '@/lib/platforms/linkedin/oauth'
import { SCOPES } from '@/lib/platforms/linkedin/config'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Require an authenticated user before starting OAuth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to connect a LinkedIn account' },
        { status: 401 },
      )
    }

    // Check for reconnect mode — existing account ID passed via query param
    const reconnect = request.nextUrl.searchParams.get('reconnect')

    const adapter = new LinkedInAdapter()
    const state = generateState()
    const url = adapter.getAuthorizationUrl(state, [...SCOPES])

    const cookieStore = await cookies()

    // Store state + userId + optional reconnectAccountId as base64 JSON for CSRF verification in callback.
    // The callback route (webhooks/linkedin/callback) parses this to:
    //   1. Verify state matches the OAuth redirect state param
    //   2. Extract userId so the callback does not need an authenticated session
    //   3. If reconnectAccountId is present, update existing account instead of creating
    const payload = Buffer.from(
      JSON.stringify({ state, userId: user.id, reconnectAccountId: reconnect ?? null }),
    ).toString('base64')

    cookieStore.set('oauth_state_linkedin', payload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return NextResponse.redirect(url)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to initiate LinkedIn OAuth', detail: message },
      { status: 500 },
    )
  }
}
