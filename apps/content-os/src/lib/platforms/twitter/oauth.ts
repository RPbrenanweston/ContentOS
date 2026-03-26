import crypto from 'node:crypto';
import { AUTH_URL, TOKEN_URL, SCOPES } from './config';
import type { TokenSet } from '../types';
import { PlatformError } from '../types';

// ─── PKCE S256 Helpers ─────────────────────────────────────

/**
 * Generate a cryptographically random code verifier (43-128 chars).
 * Uses 32 random bytes -> 43 base64url chars.
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Derive the S256 code challenge from a verifier.
 * SHA-256 hash, base64url-encoded (no padding).
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

// ─── Authorization URL ─────────────────────────────────────

export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes?: string[];
}): string {
  const { clientId, redirectUri, state, codeChallenge, scopes } = params;
  const url = new URL(AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', (scopes ?? [...SCOPES]).join(' '));
  return url.toString();
}

// ─── Token Exchange ────────────────────────────────────────

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<TokenSet> {
  const { code, codeVerifier, clientId, redirectUri } = params;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
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
      'twitter',
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

// ─── Token Refresh ─────────────────────────────────────────

/**
 * Refresh an access token. Twitter issues single-use refresh tokens,
 * so the returned TokenSet contains a NEW refresh token.
 */
export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
}): Promise<TokenSet> {
  const { refreshToken, clientId } = params;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
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
      'twitter',
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
