// @crumb tiktok-oauth-helpers
// LIB | OAuth | TikTok Login Kit v2
// why: Provide state generation, auth URL construction, token exchange, and user info retrieval for TikTok OAuth flow
// in:[userId for state, code for exchange, accessToken for user info] out:[authUrl, TokenSet, UserInfo]
// err:[PlatformError on token exchange failure or user info fetch failure]
// hazard: TikTok tokens expire in 24h; refresh_token valid for 365 days—must refresh before expiry
// hazard: TikTok uses client_key (not client_id) in all API calls—mismatch causes silent auth failures
// edge:./config.ts -> READS
// edge:../../../../app/api/oauth/tiktok/authorize/route.ts -> CALLS buildAuthUrl
// edge:../../../../app/api/webhooks/tiktok/callback/route.ts -> CALLS exchangeCode, getUserInfo
// prompt: Add token expiry tracking; validate scopes returned match requested scopes

import crypto from 'node:crypto';
import { AUTH_URL, TOKEN_URL, USER_INFO_URL, SCOPES } from './config';

export interface TikTokTokenResponse {
  accessToken: string;
  refreshToken: string;
  openId: string;
  expiresIn: number;
  refreshExpiresIn: number;
  scope: string;
}

export interface TikTokUserInfo {
  openId: string;
  displayName: string;
  avatarUrl: string;
}

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Build the TikTok OAuth authorization URL.
 *
 * TikTok uses `client_key` (not `client_id`) in the auth URL.
 */
export function buildAuthUrl(state: string): string {
  const clientKey = process.env.TIKTOK_CLIENT_KEY ?? '';
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI ??
    'http://localhost:3000/api/webhooks/tiktok/callback';

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(','),
    state,
  });

  return `${AUTH_URL}?${params}`;
}

/**
 * Exchange an authorization code for TikTok access and refresh tokens.
 *
 * POST https://open.tiktokapis.com/v2/oauth/token/
 * Content-Type: application/x-www-form-urlencoded
 */
export async function exchangeCode(code: string): Promise<TikTokTokenResponse> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY ?? '';
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? '';
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI ??
    'http://localhost:3000/api/webhooks/tiktok/callback';

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ContentOS/1.0',
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TikTok token exchange failed (${response.status}): ${err}`);
  }

  const json = await response.json();
  const data = json.data ?? json;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    openId: data.open_id,
    expiresIn: data.expires_in,
    refreshExpiresIn: data.refresh_expires_in,
    scope: data.scope,
  };
}

/**
 * Fetch the authenticated user's TikTok profile info.
 */
export async function getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const url = `${USER_INFO_URL}?fields=open_id,union_id,avatar_url,display_name`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'ContentOS/1.0',
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TikTok user info failed (${response.status}): ${err}`);
  }

  const json = await response.json();
  const user = json.data?.user ?? {};

  return {
    openId: user.open_id ?? '',
    displayName: user.display_name ?? '',
    avatarUrl: user.avatar_url ?? '',
  };
}
