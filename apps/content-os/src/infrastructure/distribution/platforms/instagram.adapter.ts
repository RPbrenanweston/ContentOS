// @crumb instagram-adapter-implementation
// API | Instagram Graph API | Two-step media publish
// why: Implement Instagram-specific OAuth exchange, two-step media publication (container + publish), insights retrieval, and credential validation
// in:[PlatformCredentials with accessToken and platformAccountId] out:[Instagram media IDs and URLs] err:[InstagramOAuthError|HttpError|UnsupportedMediaError]
// hazard: Two-step publish (create container then publish) can leave orphaned containers if step 2 fails
// hazard: Instagram requires image_url or video_url for posts — text-only posts are not supported by the API
// hazard: Long-lived token refresh uses GET with secret in URL query param, exposing secret in server logs
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../services/distribution.service.ts -> CALLED_BY
// edge:../../../lib/platforms/instagram/config.ts -> READS
// prompt: Add container cleanup on publish failure; move token refresh to POST; test expired token flows

/**
 * Instagram Graph API adapter.
 *
 * Uses Instagram Graph API for media publishing and insights.
 * OAuth 2.0 with authorization code flow (Meta's Instagram Basic Display API).
 * Two-step post creation: create media container, then publish.
 *
 * API docs: https://developers.facebook.com/docs/instagram-api
 */

import type { Platform } from '@/domain'
import type {
  PlatformAdapter,
  PlatformCredentials,
  PlatformPostParams,
  PlatformPostResult,
  PlatformMetrics,
  OAuthTokenResponse,
} from '../platform-adapter'
import { INSTAGRAM_CONFIG } from '../../../lib/platforms/instagram/config'

export class InstagramAdapter implements PlatformAdapter {
  readonly platform: Platform = 'instagram'
  readonly displayName = 'Instagram'

  private appId: string
  private appSecret: string
  private redirectUri: string

  constructor() {
    this.appId = INSTAGRAM_CONFIG.appId
    this.appSecret = INSTAGRAM_CONFIG.appSecret
    this.redirectUri = INSTAGRAM_CONFIG.redirectUri
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: INSTAGRAM_CONFIG.scopes.join(','),
      response_type: 'code',
      state,
    })
    return `${INSTAGRAM_CONFIG.authorizationUrl}?${params}`
  }

  async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch(INSTAGRAM_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ContentOS/1.0',
      },
      body: new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Instagram token exchange failed: ${err}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      tokenType: 'Bearer',
    }
  }

  async refreshAccessToken(accessToken: string): Promise<OAuthTokenResponse> {
    // Instagram long-lived tokens can be refreshed via ig_refresh_token grant
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: accessToken,
    })

    const response = await fetch(
      `${INSTAGRAM_CONFIG.longLivedTokenUrl}?${params}`,
      {
        method: 'GET',
        headers: { 'User-Agent': 'ContentOS/1.0' },
      },
    )

    if (!response.ok) {
      throw new Error('Instagram token refresh failed')
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type ?? 'Bearer',
    }
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    // Instagram requires an image_url or video_url — text-only posts are not supported
    if (!params.mediaUrls || params.mediaUrls.length === 0) {
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage:
          'Instagram does not support text-only posts. Provide at least one image or video URL.',
      }
    }

    const igUserId = credentials.platformAccountId

    // Step 1: Create media container
    const containerBody: Record<string, string> = {
      access_token: credentials.accessToken,
      caption: params.text,
    }

    // Determine media type from the first URL
    const mediaUrl = params.mediaUrls[0]
    if (this.isVideoUrl(mediaUrl)) {
      containerBody.media_type = 'VIDEO'
      containerBody.video_url = mediaUrl
    } else {
      containerBody.image_url = mediaUrl
    }

    const containerResponse = await fetch(
      `https://graph.instagram.com/${igUserId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ContentOS/1.0',
        },
        body: JSON.stringify(containerBody),
      },
    )

    if (!containerResponse.ok) {
      const err = await containerResponse.text()
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Instagram container creation failed (${containerResponse.status}): ${err}`,
      }
    }

    const containerData = await containerResponse.json()
    const containerId: string = containerData.id

    // Step 2: Publish the container
    const publishResponse = await fetch(
      `https://graph.instagram.com/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ContentOS/1.0',
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: credentials.accessToken,
        }),
      },
    )

    if (!publishResponse.ok) {
      const err = await publishResponse.text()
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Instagram publish failed (${publishResponse.status}): ${err}`,
      }
    }

    const publishData = await publishResponse.json()
    const postId: string = publishData.id

    const username =
      (credentials.metadata?.username as string) ?? 'user'

    return {
      externalPostId: postId,
      externalUrl: `https://www.instagram.com/p/${postId}/`,
      status: 'published',
    }
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const response = await fetch(
      `https://graph.instagram.com/${externalPostId}?access_token=${credentials.accessToken}`,
      {
        method: 'DELETE',
        headers: { 'User-Agent': 'ContentOS/1.0' },
      },
    )

    if (!response.ok) {
      throw new Error(`Instagram delete failed: ${response.status}`)
    }
  }

  async getMetrics(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<PlatformMetrics> {
    const metrics = 'impressions,reach,likes,comments'
    const response = await fetch(
      `https://graph.instagram.com/${externalPostId}/insights?metric=${metrics}&access_token=${credentials.accessToken}`,
      {
        method: 'GET',
        headers: { 'User-Agent': 'ContentOS/1.0' },
      },
    )

    if (!response.ok) {
      return {
        impressions: 0,
        views: 0,
        clicks: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      }
    }

    const json = await response.json()
    const dataMap = new Map<string, number>()
    for (const entry of json.data ?? []) {
      dataMap.set(entry.name, entry.values?.[0]?.value ?? 0)
    }

    return {
      impressions: dataMap.get('impressions') ?? 0,
      views: dataMap.get('reach') ?? 0,
      clicks: 0,
      likes: dataMap.get('likes') ?? 0,
      comments: dataMap.get('comments') ?? 0,
      shares: 0,
      saves: 0,
    }
  }

  async validateCredentials(
    credentials: PlatformCredentials,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?access_token=${credentials.accessToken}`,
        {
          method: 'GET',
          headers: { 'User-Agent': 'ContentOS/1.0' },
        },
      )
      return response.ok
    } catch {
      return false
    }
  }

  /** Simple heuristic to detect video URLs by extension */
  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    const lower = url.toLowerCase().split('?')[0]
    return videoExtensions.some((ext) => lower.endsWith(ext))
  }
}
