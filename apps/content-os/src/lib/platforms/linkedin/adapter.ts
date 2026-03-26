import {
  MAX_IMAGES,
  MAX_TEXT_LENGTH,
  SCOPES,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_VIDEO_FORMATS,
} from './config';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
} from './oauth';
import {
  createTextPost,
  createPostWithMedia,
  deletePost as apiDeletePost,
  registerMediaUpload,
  uploadMediaBinary,
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
} from '../types';
import { PlatformError } from '../types';
import type { PlatformType } from '@/domain';

// ─── LinkedIn Adapter ─────────────────────────────────────

export class LinkedInAdapter implements PlatformAdapter {
  readonly platform: PlatformType = 'linkedin';

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Missing required LinkedIn env vars: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI',
      );
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  // ── Auth ──────────────────────────────────────────────

  getAuthorizationUrl(state: string, scopes: string[]): string {
    return buildAuthorizationUrl({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      state,
      scopes: scopes.length > 0 ? scopes : [...SCOPES],
    });
  }

  async exchangeCodeForTokens(
    code: string,
    _codeVerifier?: string,
  ): Promise<TokenSet> {
    // LinkedIn does not use PKCE — codeVerifier is ignored
    return exchangeCodeForTokens({
      code,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.redirectUri,
    });
  }

  async refreshTokens(refreshToken: string): Promise<TokenSet> {
    return refreshAccessToken({
      refreshToken,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
  }

  // ── Capabilities ──────────────────────────────────────

  getCapabilities(): PlatformCapabilities {
    return getCapabilities('linkedin');
  }

  // ── Validation ────────────────────────────────────────

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
        message: 'LinkedIn post must have text or media',
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
          message: 'LinkedIn does not allow mixing images and video in a single post',
        });
      }

      // Max 9 images
      if (images.length > MAX_IMAGES) {
        errors.push({
          field: 'media',
          message: `Maximum ${MAX_IMAGES} images per post (got ${images.length})`,
          constraint: 'maxImages',
        });
      }

      // Max 1 video
      if (videos.length > 1) {
        errors.push({
          field: 'media',
          message: 'Maximum 1 video per post',
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

    // Scheduling not supported via UGC Posts API
    if (post.scheduledAt) {
      warnings.push(
        'LinkedIn UGC Posts API does not support native scheduling. Use application-level scheduling.',
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ── Media Upload ──────────────────────────────────────

  async uploadMedia(
    media: UniversalMedia,
    credentials: TokenSet,
  ): Promise<PlatformMediaRef> {
    // Resolve the person URN from token extras
    const personUrn = this.getPersonUrn(credentials);

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
          'linkedin',
          true,
        );
      }
      data = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
    } else {
      throw new PlatformError(
        'UNSUPPORTED_MEDIA_SOURCE',
        'Storage-backed media sources are not yet supported. Download the file first.',
        'linkedin',
        false,
      );
    }

    const mediaType = media.type === 'video' ? 'VIDEO' : 'IMAGE';

    // 1. Register the upload to get asset URN + upload URL
    const { asset, uploadUrl } = await registerMediaUpload(
      { authorUrn: personUrn, mediaType },
      credentials,
    );

    // 2. Upload the binary data
    await uploadMediaBinary(uploadUrl, data, mimeType);

    return {
      platform: 'linkedin',
      id: asset,
      status: 'ready',
      type: media.type,
    };
  }

  // ── Posting ───────────────────────────────────────────

  async createPost(
    post: UniversalPost,
    mediaRefs: PlatformMediaRef[],
    credentials: TokenSet,
  ): Promise<PlatformPostResult> {
    const personUrn = this.getPersonUrn(credentials);

    const visibility =
      post.visibility === 'private' || post.visibility === 'followers'
        ? 'CONNECTIONS'
        : 'PUBLIC';

    let postUrn: string;

    if (mediaRefs.length === 0) {
      // Text-only post
      const result = await createTextPost(
        { authorUrn: personUrn, text: post.text, visibility },
        credentials,
      );
      postUrn = result.postUrn;
    } else {
      // Post with media
      const assetUrns = mediaRefs.map((ref) => ref.id);
      const altTexts = post.media?.map((m) => m.altText);
      const mediaCategory = mediaRefs.some((ref) => ref.type === 'video')
        ? 'VIDEO'
        : 'IMAGE';

      const result = await createPostWithMedia(
        {
          authorUrn: personUrn,
          text: post.text,
          assetUrns,
          altTexts,
          mediaCategory: mediaCategory as 'IMAGE' | 'VIDEO',
          visibility,
        },
        credentials,
      );
      postUrn = result.postUrn;
    }

    return {
      platform: 'linkedin',
      postId: postUrn,
      url: `https://www.linkedin.com/feed/update/${postUrn}/`,
      createdAt: new Date().toISOString(),
    };
  }

  async deletePost(postId: string, credentials: TokenSet): Promise<void> {
    await apiDeletePost(postId, credentials);
  }

  // ── Rate Limiting ─────────────────────────────────────

  async getRateLimitStatus(_credentials: TokenSet): Promise<RateLimitInfo> {
    // LinkedIn does not expose rate limit headers in a queryable way.
    // Return conservative placeholder defaults.
    return {
      remaining: 100,
      limit: 100,
      resetsAt: Date.now() + 24 * 60 * 60 * 1000,
      windowType: 'rolling',
    };
  }

  // ── Private Helpers ───────────────────────────────────

  /**
   * Extract the person URN from token extras.
   * The personUrn is stored in platform_config during the OAuth callback
   * and passed through via TokenSet.extras.
   */
  private getPersonUrn(credentials: TokenSet): string {
    const personUrn = credentials.extras?.['personUrn'] as string | undefined;
    if (!personUrn) {
      throw new PlatformError(
        'MISSING_PERSON_URN',
        'LinkedIn person URN not found in token extras. Re-authenticate to fix.',
        'linkedin',
        false,
      );
    }
    return personUrn;
  }
}
