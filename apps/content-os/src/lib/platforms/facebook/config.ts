// @crumb facebook-oauth-config
// CFG | OAuth 2.0 | Facebook Graph API
// why: Centralize Facebook Login + Pages API configuration for OAuth flow and content publishing
// in:[env vars] out:[URLs, scopes, limits] err:[none — pure constants]

/** OAuth 2.0 endpoints */
export const AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';
export const TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token';

/** Graph API base */
export const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

/** Required OAuth 2.0 scopes for Pages management */
export const SCOPES = [
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_show_list',
  'public_profile',
] as const;

/** Content limits */
export const MAX_TEXT_LENGTH = 63206; // Facebook post character limit
export const MAX_IMAGES = 10;

/** Token TTL */
export const SHORT_TOKEN_TTL_SECONDS = 60 * 60; // ~1 hour (short-lived user token)
export const LONG_TOKEN_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days (long-lived user token)
// Page access tokens derived from long-lived user tokens do not expire
