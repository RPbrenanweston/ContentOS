import crypto from 'node:crypto';
import { AUTH_URL, TOKEN_URL, SCOPES } from './config';
import type { TokenSet } from '../types';
import { PlatformError } from '../types';

// ─── State Generation ─────────────────────────────────────

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

// ─── Authorization URL ────────────────────────────────────

export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}): string {
  const { clientId, redirectUri, state, scopes } = params;
  const url = new URL(AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', (scopes ?? [...SCOPES]).join(' '));
  return url.toString();
}

// ─── Token Exchange ───────────────────────────────────────

export async function exchangeCodeForTokens(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<TokenSet> {
  const { code, clientId, clientSecret, redirectUri } = params;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const raw = await response.json().catch(() => null);
    throw new PlatformError(
      'TOKEN_EXCHANGE_FAILED',
      `Token exchange failed: ${response.status} ${response.statusText}`,
      'linkedin',
      response.status >= 500,
      undefined,
      raw,
    );
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: 'Bearer',
    scope: data.scope,
  };
}

// ─── Token Refresh ────────────────────────────────────────

export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<TokenSet> {
  const { refreshToken, clientId, clientSecret } = params;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const raw = await response.json().catch(() => null);
    throw new PlatformError(
      'TOKEN_REFRESH_FAILED',
      `Token refresh failed: ${response.status} ${response.statusText}`,
      'linkedin',
      response.status >= 500,
      undefined,
      raw,
    );
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: 'Bearer',
    scope: data.scope,
  };
}
