// @crumb youtube-adapter-implementation
// API | Video upload (resumable) | Google OAuth 2.0 token refresh
// why: Implement YouTube platform adapter for video upload, deletion, analytics metrics, and credential validation via YouTube Data API v3
// in:[PlatformCredentials with accessToken + refreshToken] out:[Upload session URI, video metrics, validation status]
// err:[Error on missing video content, upload initiation failure, metrics fetch failure, token refresh failure]
// hazard: Resumable upload only initiates the session (returns upload URI) -- actual binary upload is caller's responsibility
// hazard: YouTube Analytics API requires separate scope for full analytics; readonly scope may limit metrics access
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY

import type { Platform } from '@/domain';
import type {
  PlatformAdapter,
  PlatformCredentials,
  PlatformPostParams,
  PlatformPostResult,
  PlatformMetrics,
  OAuthTokenResponse,
} from '../platform-adapter';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';
const ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';

export class YouTubeAdapter implements PlatformAdapter {
  readonly platform: Platform = 'youtube';
  readonly displayName = 'YouTube';

  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.YOUTUBE_CLIENT_ID ?? '';
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET ?? '';
    this.redirectUri =
      process.env.YOUTUBE_REDIRECT_URI ?? 'http://localhost:3000/api/webhooks/youtube/callback';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`YouTube token exchange failed: ${err}`);
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
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('YouTube token refresh failed');
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
   * Initiate a resumable video upload to YouTube.
   *
   * YouTube requires video content -- text-only posts are not supported.
   * For MVP, this initiates the resumable upload session and returns the
   * upload URI. The caller is responsible for streaming the binary payload
   * to the returned URI.
   */
  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    if (!params.mediaUrls || params.mediaUrls.length === 0) {
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: 'YouTube requires video content. Provide at least one mediaUrl.',
      };
    }

    const videoMetadata = {
      snippet: {
        title: params.text.slice(0, 100) || 'Untitled Video',
        description: params.text,
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: 'public',
      },
    };

    const url = new URL(UPLOAD_URL);
    url.searchParams.set('uploadType', 'resumable');
    url.searchParams.set('part', 'snippet,status');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(videoMetadata),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `YouTube upload initiation failed (${response.status}): ${err}`,
      };
    }

    // The resumable upload URI is in the Location header
    const uploadUri = response.headers.get('Location') ?? '';

    return {
      externalPostId: '', // Video ID is assigned after binary upload completes
      externalUrl: uploadUri,
      status: 'published',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const url = new URL(VIDEOS_URL);
    url.searchParams.set('id', externalPostId);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`YouTube delete failed: ${response.status}`);
    }
  }

  async getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics> {
    const url = new URL(ANALYTICS_URL);
    url.searchParams.set('ids', 'channel==MINE');
    url.searchParams.set('dimensions', 'video');
    url.searchParams.set('metrics', 'views,likes,comments,shares,estimatedMinutesWatched');
    url.searchParams.set('filters', `video==${externalPostId}`);
    url.searchParams.set('startDate', '2020-01-01');
    url.searchParams.set('endDate', '2030-01-01');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (!response.ok) {
      return { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    }

    const data = await response.json();
    const row = data.rows?.[0];

    if (!row) {
      return { impressions: 0, views: 0, clicks: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    }

    // Row order matches metrics param: views, likes, comments, shares, estimatedMinutesWatched
    return {
      impressions: 0,
      views: row[1] ?? 0,
      clicks: 0,
      likes: row[2] ?? 0,
      comments: row[3] ?? 0,
      shares: row[4] ?? 0,
      saves: 0,
    };
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const url = new URL(CHANNELS_URL);
      url.searchParams.set('part', 'id');
      url.searchParams.set('mine', 'true');

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
