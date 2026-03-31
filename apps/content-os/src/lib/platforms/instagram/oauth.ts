// @crumb instagram-oauth-helpers
// LIB | OAuth utilities | State generation and token exchange
// why: Encapsulate Instagram OAuth helpers — state generation, auth URL construction, code exchange, long-lived token swap, profile fetch
// in:[userId:string for buildAuthUrl] [code:string for exchangeCode] [shortToken:string for exchangeForLongLived] [accessToken:string for getProfile]
// out:[authUrl:string] [{ access_token, user_id }] [{ access_token, expires_in }] [{ id, username, profile_picture_url }]
// hazard: Short-lived token (1 hour) must be exchanged for long-lived before expiry or user must re-authenticate
// hazard: Token exchange uses form-urlencoded POST but long-lived exchange is GET with secret in query param
// edge:./config.ts -> READS INSTAGRAM_CONFIG
// edge:../../../../app/api/oauth/instagram/authorize/route.ts -> CALLS buildAuthUrl
// edge:../../../../app/api/webhooks/instagram/callback/route.ts -> CALLS exchangeCode, exchangeForLongLived, getProfile
// prompt: Add timeout to all fetch calls; validate response shapes before destructuring

import { randomBytes } from 'node:crypto'
import { INSTAGRAM_CONFIG } from './config'

/**
 * Generate a cryptographically random state string for CSRF protection.
 */
export function generateState(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Build the Instagram OAuth authorization URL.
 */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: INSTAGRAM_CONFIG.appId,
    redirect_uri: INSTAGRAM_CONFIG.redirectUri,
    scope: INSTAGRAM_CONFIG.scopes.join(','),
    response_type: 'code',
    state,
  })
  return `${INSTAGRAM_CONFIG.authorizationUrl}?${params}`
}

/**
 * Exchange an authorization code for a short-lived access token.
 *
 * Instagram returns: { access_token, user_id }
 * The short-lived token is valid for ~1 hour.
 */
export async function exchangeCode(
  code: string,
): Promise<{ accessToken: string; userId: string }> {
  const response = await fetch(INSTAGRAM_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ContentOS/1.0',
    },
    body: new URLSearchParams({
      client_id: INSTAGRAM_CONFIG.appId,
      client_secret: INSTAGRAM_CONFIG.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: INSTAGRAM_CONFIG.redirectUri,
      code,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Instagram token exchange failed (${response.status}): ${err}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    userId: String(data.user_id),
  }
}

/**
 * Exchange a short-lived token for a 60-day long-lived token.
 *
 * Instagram returns: { access_token, token_type, expires_in }
 */
export async function exchangeForLongLived(
  shortToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: INSTAGRAM_CONFIG.appSecret,
    access_token: shortToken,
  })

  const response = await fetch(
    `${INSTAGRAM_CONFIG.longLivedTokenUrl}?${params}`,
    {
      method: 'GET',
      headers: { 'User-Agent': 'ContentOS/1.0' },
    },
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Instagram long-lived token exchange failed (${response.status}): ${err}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 5184000, // Default 60 days
  }
}

/**
 * Fetch the authenticated user's Instagram profile.
 */
export async function getProfile(
  accessToken: string,
): Promise<{ id: string; username: string; profilePictureUrl: string | null }> {
  const params = new URLSearchParams({
    fields: 'id,username,profile_picture_url',
    access_token: accessToken,
  })

  const response = await fetch(`https://graph.instagram.com/me?${params}`, {
    method: 'GET',
    headers: { 'User-Agent': 'ContentOS/1.0' },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Instagram profile fetch failed (${response.status}): ${err}`)
  }

  const data = await response.json()
  return {
    id: String(data.id),
    username: data.username ?? '',
    profilePictureUrl: data.profile_picture_url ?? null,
  }
}
