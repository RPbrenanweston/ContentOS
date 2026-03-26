// ─── Twitter/X OAuth 2.0 + API Configuration ──────────────

/** OAuth 2.0 endpoints */
export const AUTH_URL = 'https://x.com/i/oauth2/authorize';
export const TOKEN_URL = 'https://api.x.com/2/oauth2/token';
export const REVOKE_URL = 'https://api.x.com/2/oauth2/revoke';

/** API endpoints */
export const MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
export const TWEET_URL = 'https://api.x.com/2/tweets';
export const USERS_ME_URL = 'https://api.x.com/2/users/me';

/** Required OAuth 2.0 scopes for full distribution functionality */
export const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
  'media.write',
] as const;

/** Content limits */
export const MAX_TEXT_LENGTH = 280;
export const MAX_IMAGES = 4;
export const MAX_VIDEO_SIZE_BYTES = 512 * 1024 * 1024; // 512 MB
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const CHUNK_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB for chunked upload

/** Supported media MIME types */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const SUPPORTED_VIDEO_FORMATS = ['video/mp4'] as const;
