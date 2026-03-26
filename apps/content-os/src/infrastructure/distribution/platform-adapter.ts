// @crumb platform-adapter-interface
// API | OAuth contract | Polymorphism
// why: Define adapter contract for multiple social platforms with unified token, post, metrics, and OAuth flows
// in:[Platform credentials] out:[PlatformAdapter implementations] err:[OAuthError|NetworkError|ValidationError]
// hazard: Token expiration logic inconsistent across platforms can silently fail authorization
// hazard: Registry mutability allows runtime adapter replacement, risking wrong implementation binding
// edge:./platforms/linkedin.adapter.ts -> IMPLEMENTS
// edge:./platforms/x.adapter.ts -> IMPLEMENTS
// edge:./platforms/threads.adapter.ts -> IMPLEMENTS
// edge:../../app/api/distribution/accounts/route.ts -> READS
// edge:../../app/api/distribution/publish/route.ts -> CALLS
// prompt: Add token expiry validation in validateCredentials; make registry immutable post-init

/**
 * Platform adapter interface.
 *
 * Each social platform implements this contract. Inspired by Mixpost's
 * adapter pattern but built from scratch in TypeScript.
 *
 * Adapters handle: OAuth token management, post formatting,
 * media upload, status polling, and error mapping.
 */

import type { Platform } from '@/domain';

export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  platformAccountId: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformPostParams {
  text: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
  threadParts?: string[]; // For multi-part posts (X threads)
  metadata?: Record<string, unknown>;
}

export interface PlatformPostResult {
  externalPostId: string;
  externalUrl: string;
  status: 'published' | 'scheduled' | 'failed';
  errorMessage?: string;
}

export interface PlatformMetrics {
  impressions: number;
  views: number;
  clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

export interface PlatformAdapter {
  readonly platform: Platform;
  readonly displayName: string;

  /** Generate the OAuth authorization URL for account connection */
  getAuthUrl(state: string): string;

  /** Exchange authorization code for access tokens */
  exchangeCode(code: string): Promise<OAuthTokenResponse>;

  /** Refresh an expired access token */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse>;

  /** Publish or schedule a post */
  createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult>;

  /** Delete a published post */
  deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void>;

  /** Fetch performance metrics for a post */
  getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics>;

  /** Validate that credentials are still valid */
  validateCredentials(credentials: PlatformCredentials): Promise<boolean>;
}

/** Registry of all available platform adapters */
const adapterRegistry = new Map<Platform, PlatformAdapter>();

export function registerAdapter(adapter: PlatformAdapter): void {
  adapterRegistry.set(adapter.platform, adapter);
}

export function getAdapter(platform: Platform): PlatformAdapter | undefined {
  return adapterRegistry.get(platform);
}

export function getAvailableAdapters(): PlatformAdapter[] {
  return Array.from(adapterRegistry.values());
}
