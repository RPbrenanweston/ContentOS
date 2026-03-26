import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TwitterAdapter } from '@/lib/platforms/twitter/adapter';
import { getUserInfo } from '@/lib/platforms/twitter/api';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth denial
  if (error) {
    const redirectUrl = new URL('/accounts', request.nextUrl.origin);
    redirectUrl.searchParams.set('error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('twitter_oauth_state')?.value;
  const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;

  // CSRF validation
  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: 'Invalid state parameter — possible CSRF' },
      { status: 403 },
    );
  }

  if (!codeVerifier) {
    return NextResponse.json(
      { error: 'Missing PKCE code verifier — session may have expired' },
      { status: 400 },
    );
  }

  try {
    const adapter = new TwitterAdapter();

    // Exchange authorization code for tokens
    const tokens = await adapter.exchangeCodeForTokens(code, codeVerifier);

    // Get user info for account identification
    const userInfo = await getUserInfo(tokens);

    // Store in distribution_accounts using admin client
    // Token encryption is handled at the DB/RLS layer
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // TODO: Get the authenticated user's ID from the session
    // For now, this requires the user to be authenticated via Supabase Auth
    const authHeader = request.headers.get('cookie');
    const supabaseUserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { cookie: authHeader ?? '' } },
      },
    );
    const {
      data: { user },
    } = await supabaseUserClient.auth.getUser();

    if (!user) {
      const redirectUrl = new URL('/accounts', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'not_authenticated');
      return NextResponse.redirect(redirectUrl);
    }

    await supabaseAdmin.from('distribution_accounts').upsert(
      {
        user_id: user.id,
        platform: 'twitter' as const,
        platform_account_id: userInfo.id,
        platform_username: userInfo.username,
        platform_display_name: userInfo.name,
        platform_avatar_url: userInfo.profileImageUrl ?? null,
        token_expires_at: new Date(tokens.expiresAt).toISOString(),
        token_scopes: tokens.scope?.split(' ') ?? [],
        is_active: true,
        last_verified_at: new Date().toISOString(),
        last_error: null,
        consecutive_failures: 0,
        // Encrypted token storage — handled by DB trigger or service layer
        platform_config: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_type: tokens.tokenType,
        },
      },
      { onConflict: 'user_id,platform,platform_account_id' },
    );

    // Clear OAuth cookies
    cookieStore.delete('twitter_oauth_state');
    cookieStore.delete('twitter_code_verifier');

    const redirectUrl = new URL('/accounts', request.nextUrl.origin);
    redirectUrl.searchParams.set('connected', 'twitter');
    redirectUrl.searchParams.set('username', userInfo.username);
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const redirectUrl = new URL('/accounts', request.nextUrl.origin);
    redirectUrl.searchParams.set('error', 'oauth_failed');
    redirectUrl.searchParams.set('detail', message);
    return NextResponse.redirect(redirectUrl);
  }
}
