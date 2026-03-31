// @crumb youtube-oauth-flow
// AUTH | Google OAuth 2.0 | Token exchange + channel profile
// why: Implement YouTube-specific OAuth helpers: state generation, auth URL construction, code exchange, and channel lookup
// in:[userId for auth URL, code for token exchange, accessToken for channel fetch]
// out:[auth URL string, YouTubeTokenResponse, YouTubeChannel info]
// err:[PlatformError on token exchange failure, fetch failures on channel lookup]
// edge:./config.ts -> IMPORTS
// edge:../../../../app/api/oauth/youtube/authorize/route.ts -> CALLED_BY
// edge:../../../../app/api/webhooks/youtube/callback/route.ts -> CALLED_BY

import crypto from 'node:crypto';
import {
  AUTH_URL,
  TOKEN_URL,
  CHANNELS_URL,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  SCOPES,
} from './config';
import { PlatformError } from '../types';

// --- State Generation ---

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

// --- Authorization URL ---

/**
 * Build the Google OAuth 2.0 authorization URL for YouTube.
 * Uses `access_type=offline` and `prompt=consent` to guarantee a refresh_token.
 */
export function buildAuthUrl(state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

// --- Token Exchange ---

export interface YouTubeTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCode(code: string): Promise<YouTubeTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
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
      `YouTube token exchange failed: ${response.status} ${response.statusText}`,
      'youtube',
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
    tokenType: data.token_type ?? 'Bearer',
    scope: data.scope ?? '',
  };
}

// --- Channel Info ---

export interface YouTubeChannel {
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
}

/**
 * Fetch the authenticated user's YouTube channel info.
 */
export async function getChannel(accessToken: string): Promise<YouTubeChannel> {
  const url = new URL(CHANNELS_URL);
  url.searchParams.set('part', 'snippet,statistics');
  url.searchParams.set('mine', 'true');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new PlatformError(
      'CHANNEL_FETCH_FAILED',
      `YouTube channel fetch failed: ${response.status}`,
      'youtube',
      response.status >= 500,
    );
  }

  const data = await response.json();
  const channel = data.items?.[0];

  if (!channel) {
    throw new PlatformError(
      'NO_CHANNEL_FOUND',
      'No YouTube channel found for this Google account',
      'youtube',
      false,
    );
  }

  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title ?? 'YouTube Channel',
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? null,
  };
}
