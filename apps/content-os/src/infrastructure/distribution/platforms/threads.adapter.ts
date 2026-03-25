// @crumb threads-adapter-implementation
// API | OAuth exchange | Two-step post creation
// why: Implement Threads-specific OAuth exchange, two-step post publication, and insights retrieval via Meta Threads API
// in:[PlatformCredentials with accessToken and platformAccountId] out:[Threads postId and post URL] err:[ThreadsOAuthError|HttpError]
// hazard: Two-step publish (create container then publish) can leave orphaned containers if step 2 fails
// hazard: Long-lived token refresh uses GET with token in URL query param, exposing token in server logs
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../services/distribution.service.ts -> CALLED_BY
// prompt: Add container cleanup on publish failure; move refresh token to POST body; test expired token flows

/**
 * Threads (Meta) API adapter.
 *
 * Uses Meta's Threads API at graph.threads.net for content publishing.
 * OAuth 2.0 with authorization code flow.
 * Two-step post creation: create media container, then publish.
 *
 * API docs: https://developers.facebook.com/docs/threads
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

export class ThreadsAdapter implements PlatformAdapter {
  readonly platform: Platform = 'threads';
  readonly displayName = 'Threads';

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.THREADS_APP_ID ?? '';
    this.clientSecret = process.env.THREADS_APP_SECRET ?? '';
    this.redirectUri = process.env.THREADS_REDIRECT_URI ?? 'http://localhost:3000/api/webhooks/threads/callback';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state,
    });
    return `https://threads.net/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Threads token exchange failed: ${err}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type ?? 'Bearer',
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'th_refresh_token',
      access_token: refreshToken,
    });
    const response = await fetch(
      `https://graph.threads.net/refresh_access_token?${params}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      throw new Error('Threads token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type ?? 'Bearer',
    };
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/${credentials.platformAccountId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'TEXT',
          text: params.text,
          access_token: credentials.accessToken,
        }),
      },
    );

    if (!containerResponse.ok) {
      const err = await containerResponse.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Threads container creation failed (${containerResponse.status}): ${err}`,
      };
    }

    const containerData = await containerResponse.json();
    const containerId: string = containerData.id;

    // Step 2: Publish the container
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${credentials.platformAccountId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: credentials.accessToken,
        }),
      },
    );

    if (!publishResponse.ok) {
      const err = await publishResponse.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Threads publish failed (${publishResponse.status}): ${err}`,
      };
    }

    const publishData = await publishResponse.json();
    const postId: string = publishData.id;

    // Derive handle from metadata or account ID for URL construction
    const handle = (credentials.metadata?.handle as string) ?? credentials.platformAccountId;

    return {
      externalPostId: postId,
      externalUrl: `https://threads.net/@${handle}/post/${postId}`,
      status: 'published',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const response = await fetch(
      `https://graph.threads.net/v1.0/${externalPostId}?access_token=${credentials.accessToken}`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      throw new Error(`Threads delete failed: ${response.status}`);
    }
  }

  async getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics> {
    const metrics = 'views,likes,replies,reposts,quotes';
    const response = await fetch(
      `https://graph.threads.net/v1.0/${externalPostId}/insights?metric=${metrics}&access_token=${credentials.accessToken}`,
    );

    if (!response.ok) {
      return { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    }

    const json = await response.json();
    const dataMap = new Map<string, number>();
    for (const entry of json.data ?? []) {
      dataMap.set(entry.name, entry.values?.[0]?.value ?? 0);
    }

    return {
      impressions: 0,
      views: dataMap.get('views') ?? 0,
      clicks: 0,
      likes: dataMap.get('likes') ?? 0,
      comments: dataMap.get('replies') ?? 0,
      shares: (dataMap.get('reposts') ?? 0) + (dataMap.get('quotes') ?? 0),
      saves: 0,
    };
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.threads.net/v1.0/me?access_token=${credentials.accessToken}`,
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
