// @crumb bluesky-adapter-implementation
// API | AT Protocol | App password auth
// why: Implement Bluesky-specific session auth, post creation, and deletion via AT Protocol (no OAuth)
// in:[PlatformCredentials with appPassword + handle] out:[AT Protocol post URI and metrics] err:[SessionError|HttpError]
// hazard: App passwords cannot be refreshed—createSession must be called fresh each time
// hazard: Bluesky has no public metrics API; getMetrics always returns zeroes
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../services/distribution.service.ts -> CALLED_BY
// prompt: Monitor AT Protocol for future metrics endpoints; validate handle format before session creation
/**
 * Bluesky (AT Protocol) adapter.
 *
 * Uses app passwords for authentication instead of OAuth.
 * Sessions are created fresh for each operation via createSession.
 *
 * AT Protocol docs: https://atproto.com/
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

interface BlueskySession {
  did: string;
  accessJwt: string;
  refreshJwt: string;
}

export class BlueskyAdapter implements PlatformAdapter {
  readonly platform: Platform = 'bluesky';
  readonly displayName = 'Bluesky';

  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BLUESKY_SERVICE_URL ?? 'https://bsky.social';
  }

  getAuthUrl(_state: string): string {
    throw new Error('Bluesky uses app passwords, not OAuth. Add credentials directly.');
  }

  async exchangeCode(_code: string): Promise<OAuthTokenResponse> {
    throw new Error('Bluesky uses app passwords, not OAuth. Add credentials directly.');
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenResponse> {
    throw new Error('Bluesky uses app passwords, not OAuth. Sessions are created fresh each time.');
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    const session = await this.createSession(credentials);

    const response = await fetch(`${this.baseUrl}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: {
          $type: 'app.bsky.feed.post',
          text: params.text,
          createdAt: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Bluesky post failed (${response.status}): ${err}`,
      };
    }

    const data = await response.json();
    const uri: string = data.uri;
    const rkey = this.extractRkey(uri);

    return {
      externalPostId: uri,
      externalUrl: `https://bsky.app/profile/${session.did}/post/${rkey}`,
      status: 'published',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const session = await this.createSession(credentials);
    const rkey = this.extractRkey(externalPostId);

    const response = await fetch(`${this.baseUrl}/xrpc/com.atproto.repo.deleteRecord`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        rkey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Bluesky delete failed: ${response.status}`);
    }
  }

  async getMetrics(
    _credentials: PlatformCredentials,
    _externalPostId: string,
  ): Promise<PlatformMetrics> {
    // Bluesky has no public metrics API yet
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

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      await this.createSession(credentials);
      return true;
    } catch {
      return false;
    }
  }

  private async createSession(credentials: PlatformCredentials): Promise<BlueskySession> {
    const handle = (credentials.metadata?.handle as string) ?? '';

    const response = await fetch(`${this.baseUrl}/xrpc/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: handle,
        password: credentials.accessToken,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Bluesky session creation failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    return {
      did: data.did,
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt,
    };
  }

  private extractRkey(atUri: string): string {
    const parts = atUri.split('/');
    return parts[parts.length - 1];
  }
}
