import {
  CHUNK_SIZE_BYTES,
  MAX_IMAGES,
  MAX_TEXT_LENGTH,
  SCOPES,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
} from './config';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
} from './oauth';
import {
  createTweet,
  deleteTweet,
  uploadMediaInit,
  uploadMediaAppend,
  uploadMediaFinalize,
  checkMediaStatus as apiCheckMediaStatus,
  getUserInfo,
} from './api';
import { getCapabilities } from '../registry';
import type {
  PlatformAdapter,
  PlatformCapabilities,
  TokenSet,
  UniversalPost,
  UniversalMedia,
  PlatformMediaRef,
  PlatformPostResult,
  RateLimitInfo,
  ValidationResult,
  MediaStatus,
} from '../types';
import { PlatformError } from '../types';
import type { PlatformType } from '@/domain';

// ─── Types ─────────────────────────────────────────────────

/**
 * Extended return type for getAuthorizationUrl.
 * Twitter requires PKCE, so we return the codeVerifier alongside the URL.
 * The caller MUST store the codeVerifier for use during token exchange.
 */
export interface AuthorizationUrlResult {
  url: string;
  codeVerifier: string;
}

// ─── Twitter Adapter ───────────────────────────────────────

export class TwitterAdapter implements PlatformAdapter {
  readonly platform: PlatformType = 'twitter';

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    const clientId = process.env.TWITTER_CLIENT_ID ?? process.env.X_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? process.env.X_CLIENT_SECRET;
    const redirectUri = process.env.TWITTER_REDIRECT_URI ?? process.env.X_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Missing required X/Twitter env vars: TWITTER_CLIENT_ID (or X_CLIENT_ID), TWITTER_CLIENT_SECRET (or X_CLIENT_SECRET), TWITTER_REDIRECT_URI (or X_REDIRECT_URI)',
      );
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  // ── Auth ───────────────────────────────────────────────

  /**
   * Build the Twitter OAuth 2.0 authorization URL with PKCE.
   *
   * NOTE: The PlatformAdapter interface returns `string`, but Twitter
   * requires PKCE so the caller needs the codeVerifier. Use
   * `getAuthorizationUrlWithPKCE()` for the full return type.
   * This method returns just the URL for interface compliance.
   */
  getAuthorizationUrl(state: string, scopes: string[]): string {
    return this.getAuthorizationUrlWithPKCE(state, scopes).url;
  }

  /**
   * Full PKCE-aware authorization URL builder.
   * Returns both the URL and the codeVerifier that must be stored
   * for the token exchange callback.
   */
  getAuthorizationUrlWithPKCE(
    state: string,
    scopes: string[],
  ): AuthorizationUrlResult {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const url = buildAuthorizationUrl({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      state,
      codeChallenge,
      scopes: scopes.length > 0 ? scopes : [...SCOPES],
    });

    return { url, codeVerifier };
  }

  async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string,
  ): Promise<TokenSet> {
    if (!codeVerifier) {
      throw new PlatformError(
        'MISSING_CODE_VERIFIER',
        'Twitter OAuth 2.0 requires a PKCE code verifier for token exchange',
        'twitter',
        false,
      );
    }

    return exchangeCodeForTokens({
      code,
      codeVerifier,
      clientId: this.clientId,
      redirectUri: this.redirectUri,
    });
  }

  async refreshTokens(refreshToken: string): Promise<TokenSet> {
    return refreshAccessToken({
      refreshToken,
      clientId: this.clientId,
    });
  }

  // ── Capabilities ───────────────────────────────────────

  getCapabilities(): PlatformCapabilities {
    return getCapabilities('twitter');
  }

  // ── Validation ─────────────────────────────────────────

  validatePost(post: UniversalPost): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: string[] = [];

    // Text length
    if (post.text.length > MAX_TEXT_LENGTH) {
      errors.push({
        field: 'text',
        message: `Text exceeds ${MAX_TEXT_LENGTH} characters (got ${post.text.length})`,
        constraint: 'maxTextLength',
      });
    }

    if (post.text.length === 0 && (!post.media || post.media.length === 0)) {
      errors.push({
        field: 'text',
        message: 'Tweet must have text or media',
      });
    }

    // Media validation
    if (post.media?.length) {
      const images = post.media.filter((m) => m.type === 'image');
      const videos = post.media.filter((m) => m.type === 'video');

      // Cannot mix images and video
      if (images.length > 0 && videos.length > 0) {
        errors.push({
          field: 'media',
          message: 'Twitter does not allow mixing images and video in a single tweet',
        });
      }

      // Max 4 images
      if (images.length > MAX_IMAGES) {
        errors.push({
          field: 'media',
          message: `Maximum ${MAX_IMAGES} images per tweet (got ${images.length})`,
          constraint: 'maxImages',
        });
      }

      // Max 1 video
      if (videos.length > 1) {
        errors.push({
          field: 'media',
          message: 'Maximum 1 video per tweet',
          constraint: 'maxVideos',
        });
      }

      // Check MIME types for binary sources
      for (const media of post.media) {
        if (media.source.kind === 'binary') {
          const allowed =
            media.type === 'image'
              ? (SUPPORTED_IMAGE_FORMATS as readonly string[])
              : (SUPPORTED_VIDEO_FORMATS as readonly string[]);
          if (!allowed.includes(media.source.mimeType)) {
            errors.push({
              field: 'media',
              message: `Unsupported ${media.type} format: ${media.source.mimeType}`,
            });
          }
        }
      }
    }

    // Scheduling not supported natively
    if (post.scheduledAt) {
      warnings.push('Twitter does not support native scheduling. Use application-level scheduling.');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ── Media Upload ───────────────────────────────────────

  async uploadMedia(
    media: UniversalMedia,
    credentials: TokenSet,
  ): Promise<PlatformMediaRef> {
    let data: Buffer;
    let mimeType: string;

    // Resolve media source to binary
    if (media.source.kind === 'binary') {
      data = media.source.data;
      mimeType = media.source.mimeType;
    } else if (media.source.kind === 'url') {
      const response = await fetch(media.source.url);
      if (!response.ok) {
        throw new PlatformError(
          'MEDIA_DOWNLOAD_FAILED',
          `Failed to download media from URL: ${response.status}`,
          'twitter',
          true,
        );
      }
      data = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
    } else {
      throw new PlatformError(
        'UNSUPPORTED_MEDIA_SOURCE',
        'Storage-backed media sources are not yet supported. Download the file first.',
        'twitter',
        false,
      );
    }

    // INIT
    const { mediaId } = await uploadMediaInit(
      { totalBytes: data.length, mimeType },
      credentials,
    );

    // APPEND chunks
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE_BYTES);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE_BYTES;
      const end = Math.min(start + CHUNK_SIZE_BYTES, data.length);
      const chunk = data.subarray(start, end);
      await uploadMediaAppend(
        { mediaId, chunk: Buffer.from(chunk), segmentIndex: i },
        credentials,
      );
    }

    // FINALIZE
    const finalized = await uploadMediaFinalize({ mediaId }, credentials);

    // If processing is required (video/GIF), poll until ready
    let status: PlatformMediaRef['status'] = 'ready';
    if (finalized.processingInfo) {
      status = 'processing';
    }

    return {
      platform: 'twitter',
      id: finalized.mediaId,
      status,
      type: media.type,
    };
  }

  async checkMediaStatus(
    mediaRef: PlatformMediaRef,
    credentials: TokenSet,
  ): Promise<MediaStatus> {
    const result = await apiCheckMediaStatus(mediaRef.id, credentials);

    switch (result.state) {
      case 'succeeded':
        return 'ready';
      case 'failed':
        return 'failed';
      case 'in_progress':
        return 'processing';
      case 'pending':
        return 'pending';
      default:
        return 'processing';
    }
  }

  // ── Posting ────────────────────────────────────────────

  async createPost(
    post: UniversalPost,
    mediaRefs: PlatformMediaRef[],
    credentials: TokenSet,
  ): Promise<PlatformPostResult> {
    const mediaIds = mediaRefs.map((ref) => ref.id);

    const result = await createTweet(
      {
        text: post.text,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
        replyToId: post.replyTo,
      },
      credentials,
    );

    return {
      platform: 'twitter',
      postId: result.id,
      url: `https://x.com/i/status/${result.id}`,
      createdAt: new Date().toISOString(),
      raw: result,
    };
  }

  async deletePost(postId: string, credentials: TokenSet): Promise<void> {
    await deleteTweet(postId, credentials);
  }

  // ── Rate Limiting ──────────────────────────────────────

  async getRateLimitStatus(_credentials: TokenSet): Promise<RateLimitInfo> {
    // Twitter does not expose a dedicated rate-limit introspection endpoint.
    // Return conservative defaults for Free tier (17 tweets/24h).
    // Actual rate limit headers are parsed per-request in handleApiError.
    return {
      remaining: 17,
      limit: 17,
      resetsAt: Date.now() + 24 * 60 * 60 * 1000,
      windowType: 'fixed',
    };
  }
}
