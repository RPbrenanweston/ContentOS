// @crumb instagram-oauth-authorize
// API | OAuth initiation | CSRF state cookie
// why: Initiate Instagram OAuth flow — verify authenticated user, generate CSRF state, set cookie, redirect to Instagram
// in:[authenticated session via Supabase cookie] out:[302 redirect to Instagram authorize URL]
// hazard: Cookie maxAge (600s) may expire if user is slow on Instagram consent screen
// edge:../../../../../lib/platforms/instagram/oauth.ts -> CALLS generateState, buildAuthUrl
// edge:../../../../../lib/supabase/server.ts -> CALLS createClient
// prompt: Consider extending maxAge for slow connections; add rate limiting

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { generateState, buildAuthUrl } from '@/lib/platforms/instagram/oauth'

export async function GET() {
  try {
    // Require an authenticated user before starting OAuth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to connect an Instagram account' },
        { status: 401 },
      )
    }

    const state = generateState()
    const url = buildAuthUrl(state)

    const cookieStore = await cookies()

    // Store state + userId as base64 JSON for CSRF verification in callback.
    const payload = Buffer.from(
      JSON.stringify({ state, userId: user.id }),
    ).toString('base64')

    cookieStore.set('oauth_state_instagram', payload, {
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
      { error: 'Failed to initiate Instagram OAuth', detail: message },
      { status: 500 },
    )
  }
}
