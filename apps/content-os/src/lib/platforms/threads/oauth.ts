import crypto from 'node:crypto';
import { APP_ID, APP_SECRET, REDIRECT_URI, SCOPES } from './config';
import { PlatformError } from '../types';

// ─── State Generation ─────────────────────────────────────

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

// ─── Authorization URL ────────────────────────────────────

/**
 * Build the Threads OAuth authorization URL.
 * Threads uses comma-separated scopes (not space-separated like LinkedIn).
 */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(','),
    response_type: 'code',
    state,
  });
  return `https://threads.net/oauth/authorize?${params}`;
}

// ─── Short-Lived Token Exchange ───────────────────────────

/**
 * Exchange an authorization code for a short-lived access token (~1 hour).
 */
export async function exchangeCode(
  code: string,
): Promise<{ shortAccessToken: string }> {
  const body = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    code,
  });

  const response = await fetch(
    'https://graph.threads.net/oauth/access_token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
  );

  if (!response.ok) {
    const raw = await response.json().catch(() => null);
    throw new PlatformError(
      'TOKEN_EXCHANGE_FAILED',
      `Threads short-lived token exchange failed: ${response.status} ${response.statusText}`,
      'threads',
      response.status >= 500,
      undefined,
      raw,
    );
  }

  const data = await response.json();
  return { shortAccessToken: data.access_token };
}

// ─── Long-Lived Token Exchange ────────────────────────────

/**
 * Exchange a short-lived token for a long-lived token (~60 days).
 * This MUST be called in the callback before storing credentials.
 */
export async function exchangeForLongLived(
  shortToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: 'th_exchange_token',
    client_secret: APP_SECRET,
    access_token: shortToken,
  });

  const response = await fetch(
    `https://graph.threads.net/access_token?${params}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    const raw = await response.json().catch(() => null);
    throw new PlatformError(
      'TOKEN_EXCHANGE_FAILED',
      `Threads long-lived token exchange failed: ${response.status} ${response.statusText}`,
      'threads',
      response.status >= 500,
      undefined,
      raw,
    );
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
