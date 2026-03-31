// ─── Reddit OAuth 2.0 Configuration ──────────────────────

/** OAuth 2.0 endpoints */
export const AUTH_URL = 'https://www.reddit.com/api/v1/authorize';
export const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';

/** Profile endpoint (authenticated API) */
export const PROFILE_URL = 'https://oauth.reddit.com/api/v1/me';

/** Credentials from environment */
export const CLIENT_ID = process.env.REDDIT_CLIENT_ID ?? '';
export const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET ?? '';
export const REDIRECT_URI = process.env.REDDIT_REDIRECT_URI ?? '';

/** Required OAuth 2.0 scopes */
export const SCOPES = ['identity', 'submit', 'read'];
