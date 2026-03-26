// ─── LinkedIn OAuth 2.0 + API Configuration ────────────────

/** OAuth 2.0 endpoints */
export const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
export const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
export const REVOKE_URL = 'https://www.linkedin.com/oauth/v2/revoke';

/** API endpoints */
export const PROFILE_URL = 'https://api.linkedin.com/v2/userinfo';
export const POSTS_URL = 'https://api.linkedin.com/v2/ugcPosts';
export const MEDIA_UPLOAD_URL = 'https://api.linkedin.com/v2/assets?action=registerUpload';

/** Required OAuth 2.0 scopes */
export const SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
] as const;

/** Content limits */
export const MAX_TEXT_LENGTH = 3000;
export const MAX_IMAGES = 9;
export const MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
export const MAX_IMAGE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_VIDEO_DURATION_SECONDS = 600; // 10 minutes

/** Supported media MIME types */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/gif',
] as const;

export const SUPPORTED_VIDEO_FORMATS = ['video/mp4'] as const;

/** LinkedIn API version header value */
export const API_VERSION_HEADER = '202401';

/** Token TTL */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days
export const REFRESH_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60; // 365 days
