// @crumb tiktok-adapter-implementation
// API | Video publishing | TikTok Content Posting API
// why: Implement TikTok OAuth2 flow, video publishing via Direct Post, metrics retrieval, and credential validation
// in:[PlatformCredentials with accessToken] out:[publish_id and post URL] err:[TikTokOAuthError|HttpError|VideoRequiredError]
// hazard: TikTok only supports video content; text-only posts will fail with descriptive error
// hazard: TikTok does not support post deletion via API; deletePost always throws
// hazard: Token refresh uses client_key/client_secret (not Basic auth); mismatch causes silent failure
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY
// prompt: Add video URL validation before publishing; implement publish status polling; handle privacy_level options
/**
 * TikTok Content Posting API adapter.
 *
 * Uses TikTok Login Kit v2 for OAuth and the Content Posting API
 * for video publishing. TikTok only supports video content.
 *
 * API docs: https://developers.tiktok.com/doc/content-posting-api-get-started
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

const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
const VIDEO_PUBLISH_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const VIDEO_QUERY_URL = 'https://open.tiktokapis.com/v2/video/query/';

export class TikTokAdapter implements PlatformAdapter {
  readonly platform: Platform = 'tiktok';
  readonly displayName = 'TikTok';

  private clientKey: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientKey = process.env.TIKTOK_CLIENT_KEY ?? '';
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? '';
    this.redirectUri =
      process.env.TIKTOK_REDIRECT_URI ??
      'http://localhost:3000/api/webhooks/tiktok/callback';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'user.info.basic,video.publish,video.upload',
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ContentOS/1.0',
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`TikTok token exchange failed: ${err}`);
    }

    const json = await response.json();
    const data = json.data ?? json;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: 'Bearer',
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ContentOS/1.0',
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('TikTok token refresh failed');
    }

    const json = await response.json();
    const data = json.data ?? json;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: 'Bearer',
      scope: data.scope,
    };
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    // TikTok only supports video content. Check for video URL in mediaUrls.
    const videoUrl = params.mediaUrls?.find((url) =>
      /\.(mp4|webm|mov)(\?|$)/i.test(url),
    );

    if (!videoUrl) {
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage:
          'TikTok requires video content. Provide a video URL in mediaUrls to publish.',
      };
    }

    const response = await fetch(VIDEO_PUBLISH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ContentOS/1.0',
      },
      body: JSON.stringify({
        post_info: {
          title: params.text.slice(0, 2200),
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_comment: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `TikTok post failed (${response.status}): ${err}`,
      };
    }

    const json = await response.json();
    const publishId = json.data?.publish_id ?? '';

    return {
      externalPostId: publishId,
      externalUrl: publishId ? `https://www.tiktok.com/@${credentials.metadata?.display_name ?? 'user'}/video/${publishId}` : '',
      status: 'published',
    };
  }

  async deletePost(
    _credentials: PlatformCredentials,
    _externalPostId: string,
  ): Promise<void> {
    throw new Error('Not supported by TikTok API');
  }

  async getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics> {
    const response = await fetch(
      `${VIDEO_QUERY_URL}?fields=id,like_count,comment_count,share_count,view_count`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ContentOS/1.0',
        },
        body: JSON.stringify({
          filters: {
            video_ids: [externalPostId],
          },
        }),
      },
    );

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

    const json = await response.json();
    const video = json.data?.videos?.[0] ?? {};

    return {
      impressions: 0,
      views: video.view_count ?? 0,
      clicks: 0,
      likes: video.like_count ?? 0,
      comments: video.comment_count ?? 0,
      shares: video.share_count ?? 0,
      saves: 0,
    };
  }

  async validateCredentials(
    credentials: PlatformCredentials,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${USER_INFO_URL}?fields=open_id,display_name`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'User-Agent': 'ContentOS/1.0',
          },
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
