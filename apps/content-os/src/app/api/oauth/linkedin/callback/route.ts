import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { LinkedInAdapter } from '@/lib/platforms/linkedin/adapter';
import { getUserInfo } from '@/lib/platforms/linkedin/api';
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
  const storedState = cookieStore.get('linkedin_oauth_state')?.value;

  // CSRF validation
  if (!storedState || storedState !== state) {
    return NextResponse.json(
      { error: 'Invalid state parameter — possible CSRF' },
      { status: 403 },
    );
  }

  try {
    const adapter = new LinkedInAdapter();

    // Exchange authorization code for tokens (no PKCE for LinkedIn)
    const tokens = await adapter.exchangeCodeForTokens(code);

    // Get user info for account identification
    const userInfo = await getUserInfo(tokens);

    // Store in distribution_accounts using admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user from session cookies
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
        platform: 'linkedin' as const,
        platform_account_id: userInfo.id,
        platform_username: userInfo.email,
        platform_display_name: userInfo.name,
        platform_avatar_url: userInfo.profileImageUrl ?? null,
        token_expires_at: new Date(tokens.expiresAt).toISOString(),
        token_scopes: tokens.scope?.split(' ') ?? [],
        is_active: true,
        last_verified_at: new Date().toISOString(),
        last_error: null,
        consecutive_failures: 0,
        platform_config: {
          personUrn: `urn:li:person:${userInfo.id}`,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_type: tokens.tokenType,
        },
      },
      { onConflict: 'user_id,platform,platform_account_id' },
    );

    // Clear OAuth cookie
    cookieStore.delete('linkedin_oauth_state');

    const redirectUrl = new URL('/accounts', request.nextUrl.origin);
    redirectUrl.searchParams.set('connected', 'linkedin');
    redirectUrl.searchParams.set('username', userInfo.name);
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const redirectUrl = new URL('/accounts', request.nextUrl.origin);
    redirectUrl.searchParams.set('error', 'oauth_failed');
    redirectUrl.searchParams.set('detail', message);
    return NextResponse.redirect(redirectUrl);
  }
}
