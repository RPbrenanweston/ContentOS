// @crumb facebook-oauth-flow
// API | OAuth 2.0 | Token exchange
// why: Implement Facebook Login OAuth flow with long-lived token exchange and Pages discovery
// in:[authorization code, user token] out:[access tokens, Page list] err:[TokenExchangeError|GraphAPIError]
// hazard: Short-lived user tokens expire in ~1 hour; must exchange for long-lived before storing
// hazard: Page tokens derived from long-lived user tokens are permanent but revoked if user removes app
// edge:./config.ts -> READS
// edge:../../../../app/api/webhooks/facebook/callback/route.ts -> CALLED_BY

import crypto from 'node:crypto';
import { AUTH_URL, TOKEN_URL, GRAPH_API_BASE, SCOPES } from './config';

// ─── Types ───────────────────────────────────────────────

export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string;
  category: string;
  pictureUrl?: string;
}

// ─── State Generation ────────────────────────────────────

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

// ─── Authorization URL ───────────────────────────────────

export function buildAuthUrl(userId: string): string {
  const clientId = process.env.FACEBOOK_APP_ID ?? '';
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI ??
    'http://localhost:3000/api/webhooks/facebook/callback';

  const state = generateState();
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES.join(','));
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

// ─── Token Exchange (code → short-lived user token) ──────

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  tokenType: string;
}> {
  const clientId = process.env.FACEBOOK_APP_ID ?? '';
  const clientSecret = process.env.FACEBOOK_APP_SECRET ?? '';
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI ??
    'http://localhost:3000/api/webhooks/facebook/callback';

  const url = new URL(TOKEN_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('code', code);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'User-Agent': 'ContentOS/1.0' },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Facebook token exchange failed: ${err}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    tokenType: data.token_type ?? 'bearer',
  };
}

// ─── Long-Lived Token Exchange ───────────────────────────

export async function exchangeForLongLived(shortToken: string): Promise<{
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}> {
  const clientId = process.env.FACEBOOK_APP_ID ?? '';
  const clientSecret = process.env.FACEBOOK_APP_SECRET ?? '';

  const url = new URL(TOKEN_URL);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('client_secret', clientSecret);
  url.searchParams.set('fb_exchange_token', shortToken);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'User-Agent': 'ContentOS/1.0' },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Facebook long-lived token exchange failed: ${err}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    tokenType: data.token_type ?? 'bearer',
    expiresIn: data.expires_in ?? 5184000, // default 60 days
  };
}

// ─── Get User's Pages ────────────────────────────────────

export async function getPages(userToken: string): Promise<FacebookPage[]> {
  const url = new URL(`${GRAPH_API_BASE}/me/accounts`);
  url.searchParams.set('access_token', userToken);
  url.searchParams.set('fields', 'id,name,access_token,category,picture');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'User-Agent': 'ContentOS/1.0' },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Facebook Pages fetch failed: ${err}`);
  }

  const data = await response.json();
  return (data.data ?? []).map((page: Record<string, unknown>) => ({
    id: page.id as string,
    name: page.name as string,
    accessToken: page.access_token as string,
    category: (page.category as string) ?? '',
    pictureUrl: (page.picture as Record<string, Record<string, string>>)?.data?.url,
  }));
}
