import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateState, buildAuthUrl } from '@/lib/platforms/threads/oauth'
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
        { error: 'You must be signed in to connect a Threads account' },
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

    cookieStore.set('oauth_state_threads', payload, {
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
      { error: 'Failed to initiate Threads OAuth', detail: message },
      { status: 500 },
    )
  }
}
