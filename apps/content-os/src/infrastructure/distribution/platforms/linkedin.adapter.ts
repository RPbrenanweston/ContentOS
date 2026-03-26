// @crumb linkedin-adapter-implementation
// API | OAuth exchange | Media post creation
// why: Implement LinkedIn-specific OAuth exchange, post publication, and profile metrics retrieval
// in:[PlatformCredentials with accessToken] out:[LinkedIn externalPostId and profile URN] err:[LinkedInOAuthError|HttpError]
// hazard: Profile URN extraction assumes sub field exists; missing sub crashes getProfileUrn
// hazard: Scope 'w_member_social' insufficient for all metrics APIs (impressions require separate call)
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY
// prompt: Add sub field null check; document partial metrics limitation; test scope permissions
/**
 * LinkedIn Marketing API adapter.
 *
 * Uses LinkedIn's Community Management API for post creation.
 * OAuth 2.0 with 3-legged flow for user authorization.
 *
 * API docs: https://learn.microsoft.com/en-us/linkedin/marketing/
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

export class LinkedInAdapter implements PlatformAdapter {
  readonly platform: Platform = 'linkedin';
  readonly displayName = 'LinkedIn';

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID ?? '';
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? '';
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? 'http://localhost:3000/api/webhooks/linkedin/callback';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'openid profile w_member_social',
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LinkedIn token exchange failed: ${err}`);
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
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
      throw new Error('LinkedIn token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type ?? 'Bearer',
    };
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    // Get user profile URN
    const profileUrn = await this.getProfileUrn(credentials.accessToken);

    // Build post payload (Community Management API)
    const postBody: Record<string, unknown> = {
      author: profileUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: params.text,
          },
          shareMediaCategory: params.mediaUrls?.length ? 'IMAGE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `LinkedIn post failed (${response.status}): ${err}`,
      };
    }

    const postId = response.headers.get('x-restli-id') ?? '';
    return {
      externalPostId: postId,
      externalUrl: `https://www.linkedin.com/feed/update/${postId}`,
      status: 'published',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const response = await fetch(
      `https://api.linkedin.com/v2/ugcPosts/${externalPostId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`LinkedIn delete failed: ${response.status}`);
    }
  }

  async getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics> {
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${externalPostId}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    if (!response.ok) {
      return { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    }

    const data = await response.json();
    return {
      impressions: 0, // Requires separate analytics API call
      views: 0,
      clicks: 0,
      likes: data.likesSummary?.totalLikes ?? 0,
      comments: data.commentsSummary?.totalFirstLevelComments ?? 0,
      shares: 0,
      saves: 0,
    };
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async getProfileUrn(accessToken: string): Promise<string> {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to get LinkedIn profile');
    }

    const data = await response.json();
    return `urn:li:person:${data.sub}`;
  }
}
