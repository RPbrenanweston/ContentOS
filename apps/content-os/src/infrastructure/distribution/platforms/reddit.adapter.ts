// @crumb reddit-adapter-implementation
// API | OAuth2 exchange | Subreddit post submission
// why: Implement Reddit OAuth2 flow, self-post submission to subreddits, and upvote-based metrics retrieval
// in:[PlatformCredentials with accessToken] out:[Reddit fullname (t3_*) and post URL] err:[RedditOAuthError|HttpError|SubredditError]
// hazard: Missing subreddit in metadata silently fails; must validate before submit
// hazard: Reddit rate limits (60 req/min) not enforced client-side; burst posting triggers 429
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY
// prompt: Add subreddit validation; implement rate-limit backoff; handle shadowban detection in validateCredentials
/**
 * Reddit API adapter.
 *
 * Uses Reddit's OAuth2 flow for user authorization and the
 * authenticated API at oauth.reddit.com for post operations.
 *
 * API docs: https://www.reddit.com/dev/api/
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

export class RedditAdapter implements PlatformAdapter {
  readonly platform: Platform = 'reddit';
  readonly displayName = 'Reddit';

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private userAgent: string;

  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID ?? '';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET ?? '';
    this.redirectUri = process.env.REDDIT_REDIRECT_URI ?? 'http://localhost:3000/api/webhooks/reddit/callback';
    this.userAgent = process.env.REDDIT_USER_AGENT ?? 'ContentOS/1.0';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      state,
      redirect_uri: this.redirectUri,
      duration: 'permanent',
      scope: 'identity,submit,read',
    });
    return `https://www.reddit.com/api/v1/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(this.clientId + ':' + this.clientSecret)}`,
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Reddit token exchange failed: ${err}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type ?? 'bearer',
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(this.clientId + ':' + this.clientSecret)}`,
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Reddit token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type ?? 'bearer',
    };
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    const subreddit = params.metadata?.subreddit as string | undefined;
    if (!subreddit) {
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: 'Reddit post requires metadata.subreddit to be set',
      };
    }

    // Split text: first line is title, rest is body
    const lines = params.text.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        sr: subreddit,
        kind: 'self',
        title,
        text: body,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Reddit post failed (${response.status}): ${err}`,
      };
    }

    const data = await response.json();
    const name = data.json?.data?.name ?? '';
    const url = data.json?.data?.url ?? '';

    return {
      externalPostId: name,
      externalUrl: url,
      status: 'published',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const response = await fetch('https://oauth.reddit.com/api/del', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        id: externalPostId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Reddit delete failed: ${response.status}`);
    }
  }

  async getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics> {
    const response = await fetch(
      `https://oauth.reddit.com/api/info?id=${externalPostId}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'User-Agent': this.userAgent,
        },
      },
    );

    if (!response.ok) {
      return { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    }

    const data = await response.json();
    const post = data.data?.children?.[0]?.data;

    if (!post) {
      return { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    }

    // Approximate views from upvotes and upvote_ratio
    // If ratio is 0.75 and ups is 30, total votes ~ 30/0.75 = 40, views likely 10x votes
    const upvoteRatio = post.upvote_ratio ?? 0;
    const ups = post.ups ?? 0;
    const estimatedTotalVotes = upvoteRatio > 0 ? Math.round(ups / upvoteRatio) : ups;
    const estimatedViews = estimatedTotalVotes * 10;

    return {
      impressions: ups,
      views: estimatedViews,
      clicks: 0,
      likes: post.score ?? 0,
      comments: post.num_comments ?? 0,
      shares: 0,
      saves: 0,
    };
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const response = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'User-Agent': this.userAgent,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
