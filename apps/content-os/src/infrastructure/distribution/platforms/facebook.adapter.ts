// @crumb facebook-adapter-implementation
// API | OAuth exchange | Page post creation
// why: Implement Facebook Pages API adapter for post publishing, deletion, metrics, and credential validation
// in:[PlatformCredentials with page access_token and page_id] out:[Facebook post ID and URL] err:[GraphAPIError|HttpError]
// hazard: Page access tokens are permanent but revoked if user removes the app or changes page roles
// hazard: Insights API requires minimum post age (~30 min) before metrics populate
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY
// prompt: Validate page_id exists in metadata before posting; handle token revocation gracefully
/**
 * Facebook Pages API adapter.
 *
 * Uses Facebook Graph API v19.0 for Page post management.
 * OAuth 2.0 with Facebook Login for user authorization,
 * then Page Access Tokens for posting.
 *
 * API docs: https://developers.facebook.com/docs/pages-api/
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

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export class FacebookAdapter implements PlatformAdapter {
  readonly platform: Platform = 'facebook';
  readonly displayName = 'Facebook';

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.FACEBOOK_APP_ID ?? '';
    this.clientSecret = process.env.FACEBOOK_APP_SECRET ?? '';
    this.redirectUri =
      process.env.FACEBOOK_REDIRECT_URI ??
      'http://localhost:3000/api/webhooks/facebook/callback';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,public_profile',
      state,
      response_type: 'code',
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('client_secret', this.clientSecret);
    url.searchParams.set('code', code);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'User-Agent': 'ContentOS/1.0' },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Facebook token exchange failed: ${err}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      tokenType: data.token_type ?? 'bearer',
      expiresIn: data.expires_in,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenResponse> {
    // Facebook Page tokens are permanent (derived from long-lived user token).
    // Refreshing means re-exchanging the user token for a new long-lived token.
    // This is handled at the OAuth flow level, not at the adapter level.
    throw new Error(
      'Facebook Page tokens do not expire. Re-authenticate via OAuth to refresh.',
    );
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    const pageId = credentials.platformAccountId;
    const pageToken = credentials.accessToken;

    if (!pageId) {
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: 'Facebook post requires a Page ID (platformAccountId)',
      };
    }

    const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ContentOS/1.0',
      },
      body: JSON.stringify({
        message: params.text,
        access_token: pageToken,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Facebook post failed (${response.status}): ${err}`,
      };
    }

    const data = await response.json();
    const postId = data.id ?? '';

    return {
      externalPostId: postId,
      externalUrl: `https://www.facebook.com/${postId.replace('_', '/posts/')}`,
      status: 'published',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const response = await fetch(
      `${GRAPH_API_BASE}/${externalPostId}?access_token=${credentials.accessToken}`,
      {
        method: 'DELETE',
        headers: { 'User-Agent': 'ContentOS/1.0' },
      },
    );

    if (!response.ok) {
      throw new Error(`Facebook delete failed: ${response.status}`);
    }
  }

  async getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics> {
    const metrics = 'post_impressions,post_reactions_like_total,post_comments,post_shares';
    const url = `${GRAPH_API_BASE}/${externalPostId}/insights?metric=${metrics}&access_token=${credentials.accessToken}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'ContentOS/1.0' },
    });

    if (!response.ok) {
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

    const data = await response.json();
    const insightsData = data.data ?? [];

    const getValue = (name: string): number => {
      const metric = insightsData.find(
        (m: Record<string, unknown>) => m.name === name,
      );
      if (!metric) return 0;
      const values = metric.values as Array<{ value: number }> | undefined;
      return values?.[0]?.value ?? 0;
    };

    return {
      impressions: getValue('post_impressions'),
      views: 0,
      clicks: 0,
      likes: getValue('post_reactions_like_total'),
      comments: getValue('post_comments'),
      shares: getValue('post_shares'),
      saves: 0,
    };
  }

  async validateCredentials(
    credentials: PlatformCredentials,
  ): Promise<boolean> {
    try {
      const pageId = credentials.platformAccountId;
      const response = await fetch(
        `${GRAPH_API_BASE}/${pageId}?access_token=${credentials.accessToken}`,
        {
          method: 'GET',
          headers: { 'User-Agent': 'ContentOS/1.0' },
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
