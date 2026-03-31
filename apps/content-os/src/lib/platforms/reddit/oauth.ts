import crypto from 'node:crypto';
import { AUTH_URL, TOKEN_URL, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SCOPES } from './config';
import { PlatformError } from '../types';

// ─── State Generation ─────────────────────────────────────

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

// ─── Authorization URL ────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('duration', 'permanent');
  url.searchParams.set('scope', SCOPES.join(' '));
  return url.toString();
}

// ─── Token Exchange ───────────────────────────────────────

export interface RedditTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export async function exchangeCode(code: string): Promise<RedditTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const raw = await response.json().catch(() => null);
    throw new PlatformError(
      'TOKEN_EXCHANGE_FAILED',
      `Reddit token exchange failed: ${response.status} ${response.statusText}`,
      'reddit',
      response.status >= 500,
      undefined,
      raw,
    );
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type ?? 'bearer',
    scope: data.scope ?? '',
  };
}
