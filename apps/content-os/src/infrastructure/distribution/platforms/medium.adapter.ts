// @crumb medium-adapter-implementation
// API | Token auth | Article post creation
// why: Implement Medium integration token auth, article publication, and credential validation via Medium API
// in:[PlatformCredentials with accessToken] out:[Medium postId and post URL] err:[MediumAuthError|HttpError]
// hazard: Medium has no public metrics API — getMetrics returns zeroed stub
// hazard: authorId fetched on every createPost; consider caching in credentials.metadata to avoid extra round-trip
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY
// prompt: Cache authorId in credentials.metadata; handle Medium rate limits (POST /v1/users/:id/posts allows 100/day)

/**
 * Medium API adapter.
 *
 * Uses Medium's Integration Token for authentication (Bearer token).
 * Supports contentFormat "html" and "markdown".
 * Note: Medium has no public metrics API — getMetrics returns a zeroed stub.
 *
 * API docs: https://github.com/Medium/medium-api-docs
 */

import type { Platform } from '@/domain';
import type {
  PlatformAdapter,
  PlatformCredentials,
  PlatformPostParams,
  PlatformPostResult,
  PlatformMetrics,
  OAuthTokenResponse,
} from '../platform-adapter';
import { DistributionError } from '@/lib/errors';

type MediumContentFormat = 'html' | 'markdown';
type MediumPublishStatus = 'public' | 'draft' | 'unlisted';

export class MediumAdapter implements PlatformAdapter {
  readonly platform: Platform = 'medium';
  readonly displayName = 'Medium';

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.MEDIUM_CLIENT_ID ?? '';
    this.clientSecret = process.env.MEDIUM_CLIENT_SECRET ?? '';
    this.redirectUri =
      process.env.MEDIUM_REDIRECT_URI ??
      'http://localhost:3000/api/webhooks/medium/callback';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'basicProfile,publishPost',
      state,
      response_type: 'code',
      redirect_uri: this.redirectUri,
    });
    return `https://medium.com/m/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://api.medium.com/v1/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new DistributionError(
        `Medium token exchange failed: ${err}`,
        'medium',
      );
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_at,
      tokenType: data.token_type ?? 'Bearer',
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://api.medium.com/v1/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new DistributionError('Medium token refresh failed', 'medium');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_at,
      tokenType: data.token_type ?? 'Bearer',
    };
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    let authorId: string;
    try {
      authorId = await this.getAuthorId(credentials.accessToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Medium: failed to resolve author ID — ${message}`,
      };
    }

    // Derive title: first non-empty line, or fall back to "Untitled"
    const lines = params.text.split('\n');
    const title =
      (lines.find((l) => l.trim().length > 0) ?? 'Untitled').trim();

    // Content format from metadata or default to "html"
    const contentFormat: MediumContentFormat =
      (params.metadata?.contentFormat as MediumContentFormat | undefined) ===
      'markdown'
        ? 'markdown'
        : 'html';

    // Publish status from metadata or default to "draft"
    const publishStatus: MediumPublishStatus =
      (params.metadata?.publishStatus as MediumPublishStatus | undefined) ??
      'draft';

    const tags = Array.isArray(params.metadata?.tags)
      ? (params.metadata.tags as string[]).slice(0, 5)
      : [];

    const body: Record<string, unknown> = {
      title,
      contentFormat,
      content: params.text,
      publishStatus,
      ...(tags.length > 0 && { tags }),
    };

    let response: Response;
    try {
      response = await fetch(
        `https://api.medium.com/v1/users/${authorId}/posts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new DistributionError(
        `Medium network error during createPost: ${message}`,
        'medium',
      );
    }

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Medium post failed (${response.status}): ${err}`,
      };
    }

    const data = await response.json();
    const post = data.data as {
      id: string;
      url: string;
    };

    return {
      externalPostId: post.id,
      externalUrl: post.url,
      status: 'published',
    };
  }

  async deletePost(
    _credentials: PlatformCredentials,
    _externalPostId: string,
  ): Promise<void> {
    // Medium's public API does not support post deletion.
    // No-op to satisfy the interface contract.
  }

  async getMetrics(
    _credentials: PlatformCredentials,
    _externalPostId: string,
  ): Promise<PlatformMetrics> {
    // TODO: Medium has no public metrics API.
    // Return zeroed stub until Medium exposes analytics endpoints.
    return {
      impressions: 0,
      views: 0,
      clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };
  }

  async validateCredentials(
    credentials: PlatformCredentials,
  ): Promise<boolean> {
    try {
      const response = await fetch('https://api.medium.com/v1/me', {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async getAuthorId(accessToken: string): Promise<string> {
    const response = await fetch('https://api.medium.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new DistributionError(
        `Medium GET /v1/me failed (${response.status})`,
        'medium',
      );
    }

    const data = await response.json();
    const id: string | undefined = data?.data?.id;
    if (!id) {
      throw new DistributionError(
        'Medium GET /v1/me returned no user id',
        'medium',
      );
    }
    return id;
  }
}
