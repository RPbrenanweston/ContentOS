// @crumb youtube-oauth-config
// CONFIG | Google OAuth 2.0 endpoints | YouTube Data API v3
// why: Centralise YouTube/Google OAuth endpoints, credentials, and scopes for reuse across auth and adapter flows
// in:[Environment variables] out:[Typed config constants] err:[Missing env vars cause empty-string fallback]
// edge:./oauth.ts -> IMPORTS
// edge:../../../../app/api/webhooks/youtube/callback/route.ts -> IMPORTS

/** Google OAuth 2.0 endpoints */
export const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** YouTube Data API v3 */
export const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';

/** Credentials from environment */
export const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID ?? '';
export const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET ?? '';
export const REDIRECT_URI =
  process.env.YOUTUBE_REDIRECT_URI ?? 'http://localhost:3000/api/webhooks/youtube/callback';

/** Required OAuth 2.0 scopes (upload + read-only channel info) */
export const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];
