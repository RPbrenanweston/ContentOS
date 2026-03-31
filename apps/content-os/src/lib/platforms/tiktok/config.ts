// @crumb tiktok-platform-config
// LIB | configuration | TikTok Login Kit + Content Posting API
// why: Centralize TikTok OAuth and API endpoint URLs, scopes, and content limits for the TikTok adapter
// in: None (pure configuration)
// out: Exported constants for OAuth URLs, API endpoints, scopes, and content limits
// err: Missing env vars will cause empty strings at runtime; validated at OAuth initiation time
// edge:./oauth.ts -> READS
// edge:../../../../infrastructure/distribution/platforms/tiktok.adapter.ts -> READS
// prompt: Validate env vars are present before OAuth flow starts; add privacy_level options as union type

/** OAuth 2.0 endpoints (TikTok Login Kit v2) */
export const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
export const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

/** API endpoints */
export const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
export const VIDEO_PUBLISH_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
export const VIDEO_QUERY_URL = 'https://open.tiktokapis.com/v2/video/query/';

/** Required OAuth scopes for content distribution */
export const SCOPES = ['user.info.basic', 'video.publish', 'video.upload'] as const;

/** Content limits */
export const MAX_VIDEO_SIZE_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
export const MAX_VIDEO_DURATION_SECONDS = 10 * 60; // 10 minutes
export const MAX_TITLE_LENGTH = 2200; // TikTok caption limit

/** Supported video formats */
export const SUPPORTED_VIDEO_FORMATS = ['video/mp4', 'video/webm'] as const;
