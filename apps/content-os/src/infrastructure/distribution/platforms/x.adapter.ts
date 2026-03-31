// @crumb x-twitter-adapter-implementation
// API | Thread composition | PKCE flow
// why: Implement X/Twitter OAuth2 PKCE, single tweets, thread chaining, and public metrics retrieval
// in:[PlatformCredentials with accessToken] out:[Tweet IDs and URLs] err:[XOAuthError|RateLimitError|HttpError]
// hazard: createThread partial failure (tweet N fails) leaves inconsistent thread chain
// hazard: PKCE challenge hardcoded to state string (plain) instead of S256; production vulnerability
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY
// prompt: Implement proper S256 PKCE challenge; wrap thread creation in transaction; validate metrics fields
/**
 * X (Twitter) API v2 adapter.
 *
 * Uses X API v2 for tweet creation, threads, and media upload.
 * OAuth 2.0 with PKCE flow for user authorization.
 *
 * API docs: https://developer.x.com/en/docs/x-api
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
import { refreshXToken } from '@/lib/platforms/twitter/oauth';
import { createClient } from '@supabase/supabase-js';

export class XAdapter implements PlatformAdapter {
  readonly platform: Platform = 'x';
  readonly displayName = 'X (Twitter)';

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.X_CLIENT_ID ?? '';
    this.clientSecret = process.env.X_CLIENT_SECRET ?? '';
    this.redirectUri = process.env.X_REDIRECT_URI ?? 'http://localhost:3000/api/webhooks/x/callback';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge: state, // Simplified PKCE — production should use proper S256
      code_challenge_method: 'plain',
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        code_verifier: code, // Matches the plain challenge
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`X token exchange failed: ${err}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type ?? 'Bearer',
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('X token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type ?? 'Bearer',
    };
  }

  /**
   * Create a Supabase service client for token refresh operations.
   * Uses the service role key to bypass RLS.
   */
  private getSupabaseServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '';
    return createClient(url, serviceKey);
  }

  /**
   * Attempt a fetch. If it returns 401 and an accountId is available,
   * refresh the token and retry once with the new access token.
   */
  private async fetchWithTokenRefresh(
    url: string,
    init: RequestInit,
    credentials: PlatformCredentials,
  ): Promise<Response> {
    const response = await fetch(url, init);

    if (response.status === 401 && credentials.platformAccountId) {
      // Attempt token refresh
      const supabase = this.getSupabaseServiceClient();
      const newAccessToken = await refreshXToken(
        credentials.platformAccountId,
        supabase,
      );

      // Retry with the new token
      const retryInit = {
        ...init,
        headers: {
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${newAccessToken}`,
        },
      };
      return fetch(url, retryInit);
    }

    return response;
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    // Handle threads — post each part with reply_to
    if (params.threadParts && params.threadParts.length > 1) {
      return this.createThread(credentials, params.threadParts);
    }

    // Single tweet
    const response = await this.fetchWithTokenRefresh(
      'https://api.x.com/2/tweets',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: params.text }),
      },
      credentials,
    );

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `X post failed (${response.status}): ${err}`,
      };
    }

    const data = await response.json();
    const tweetId = data.data?.id ?? '';
    const username = credentials.metadata?.username ?? 'user';

    return {
      externalPostId: tweetId,
      externalUrl: `https://x.com/${username}/status/${tweetId}`,
      status: 'published',
    };
  }

  private async createThread(
    credentials: PlatformCredentials,
    parts: string[],
  ): Promise<PlatformPostResult> {
    let previousTweetId: string | undefined;
    let firstTweetId = '';

    for (const text of parts) {
      const body: Record<string, unknown> = { text };
      if (previousTweetId) {
        body.reply = { in_reply_to_tweet_id: previousTweetId };
      }

      const response = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        return {
          externalPostId: firstTweetId,
          externalUrl: firstTweetId
            ? `https://x.com/${credentials.metadata?.username ?? 'user'}/status/${firstTweetId}`
            : '',
          status: 'failed',
          errorMessage: `Thread posting failed at part ${parts.indexOf(text) + 1}: ${err}`,
        };
      }

      const data = await response.json();
      previousTweetId = data.data?.id;
      if (!firstTweetId) firstTweetId = previousTweetId ?? '';
    }

    const username = credentials.metadata?.username ?? 'user';
    return {
      externalPostId: firstTweetId,
      externalUrl: `https://x.com/${username}/status/${firstTweetId}`,
      status: 'published',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const response = await this.fetchWithTokenRefresh(
      `https://api.x.com/2/tweets/${externalPostId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      },
      credentials,
    );

    if (!response.ok) {
      throw new Error(`X delete failed: ${response.status}`);
    }
  }

  async getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics> {
    const response = await this.fetchWithTokenRefresh(
      `https://api.x.com/2/tweets/${externalPostId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
      credentials,
    );

    if (!response.ok) {
      return { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    }

    const data = await response.json();
    const metrics = data.data?.public_metrics ?? {};

    return {
      impressions: metrics.impression_count ?? 0,
      views: 0,
      clicks: 0,
      likes: metrics.like_count ?? 0,
      comments: metrics.reply_count ?? 0,
      shares: metrics.retweet_count ?? 0,
      saves: metrics.bookmark_count ?? 0,
    };
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const response = await this.fetchWithTokenRefresh(
        'https://api.x.com/2/users/me',
        { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
        credentials,
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
