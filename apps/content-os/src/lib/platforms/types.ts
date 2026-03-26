import type { PlatformType } from '@/domain';

// ─── Token Management ───────────────────────────────────

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // unix timestamp ms
  tokenType: 'Bearer' | 'DPoP';
  scope?: string;
  /** Platform-specific extras (LinkedIn version header, FB page tokens, etc.) */
  extras?: Record<string, unknown>;
}

// ─── Capabilities ───────────────────────────────────────

export interface PlatformCapabilities {
  maxTextLength: number;
  maxImages: number;
  maxVideos: number;
  maxVideoSize: number; // bytes
  maxImageSize: number; // bytes
  maxVideoDuration: number; // seconds
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
  supportsPolls: boolean;
  supportsScheduling: boolean;
  supportsCarousel: boolean;
  supportsThreads: boolean;
  supportsAltText: boolean;
  mediaUploadPattern: 'binary' | 'url' | 'container';
  requiresPKCE: boolean;
  authType: 'oauth2' | 'session';
}

// ─── Universal Post Schema ──────────────────────────────

export interface UniversalPost {
  text: string;
  media?: UniversalMedia[];
  replyTo?: string;
  visibility?: 'public' | 'private' | 'unlisted' | 'followers';
  scheduledAt?: { dateTime: string; timezone: string };
  platformOverrides?: Partial<Record<PlatformType, Record<string, unknown>>>;
}

export interface UniversalMedia {
  type: 'image' | 'video' | 'document';
  source:
    | { kind: 'url'; url: string }
    | { kind: 'binary'; data: Buffer; mimeType: string }
    | { kind: 'storage'; storagePath: string };
  altText?: string;
  platformRef?: string;
}

// ─── Media ──────────────────────────────────────────────

export interface PlatformMediaRef {
  platform: PlatformType;
  id: string; // media_id, URN, BlobRef, container_id
  status: 'pending' | 'processing' | 'ready' | 'failed';
  type: 'image' | 'video' | 'document';
}

export type MediaStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'expired';

// ─── Post Result ────────────────────────────────────────

export interface PlatformPostResult {
  platform: PlatformType;
  postId: string;
  url?: string;
  createdAt: string;
  raw?: unknown;
}

// ─── Rate Limiting ──────────────────────────────────────

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetsAt: number; // unix timestamp ms
  windowType: 'rolling' | 'fixed';
}

// ─── Validation ─────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  constraint?: string; // e.g., 'maxTextLength'
}

// ─── Errors ─────────────────────────────────────────────

export class PlatformError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly platform: PlatformType,
    public readonly retryable: boolean,
    public readonly retryAfterMs?: number,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

// ─── The Adapter Interface ──────────────────────────────

export interface PlatformAdapter {
  readonly platform: PlatformType;

  // Auth
  getAuthorizationUrl(state: string, scopes: string[]): string;
  exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<TokenSet>;
  refreshTokens(refreshToken: string): Promise<TokenSet>;

  // Capabilities
  getCapabilities(): PlatformCapabilities;

  // Validation
  validatePost(post: UniversalPost): ValidationResult;

  // Media
  uploadMedia(media: UniversalMedia, credentials: TokenSet): Promise<PlatformMediaRef>;
  checkMediaStatus?(mediaRef: PlatformMediaRef, credentials: TokenSet): Promise<MediaStatus>;

  // Posting
  createPost(
    post: UniversalPost,
    mediaRefs: PlatformMediaRef[],
    credentials: TokenSet,
  ): Promise<PlatformPostResult>;
  deletePost(postId: string, credentials: TokenSet): Promise<void>;

  // Rate limiting
  getRateLimitStatus(credentials: TokenSet): Promise<RateLimitInfo>;
}
