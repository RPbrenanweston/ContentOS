// @crumb beehiiv-adapter-implementation
// API | Bearer token auth | Newsletter post creation
// why: Implement Beehiiv-specific post creation, credential validation, and metrics stub via Beehiiv REST API v2
// in:[PlatformCredentials with accessToken + metadata.publicationId] out:[Beehiiv post id and web URL] err:[DistributionError]
// hazard: publicationId missing from metadata causes immediate failure; must validate before API call
// hazard: Beehiiv API returns 200 on post creation but post may be in draft—check status field in response
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../services/distribution.service.ts -> CALLED_BY
// prompt: Add publicationId null check with descriptive error; validate content is non-empty HTML before submitting
/**
 * Beehiiv publishing adapter.
 *
 * Uses Beehiiv's REST API v2 for newsletter post creation.
 * Auth: Bearer token (API key). No OAuth flow — credentials added directly.
 *
 * API docs: https://developers.beehiiv.com/docs/v2
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

const BEEHIIV_API_BASE = 'https://api.beehiiv.com/v2';

export class BeehiivAdapter implements PlatformAdapter {
  readonly platform: Platform = 'beehiiv';
  readonly displayName = 'Beehiiv';

  getAuthUrl(_state: string): string {
    throw new DistributionError(
      'Beehiiv uses API keys, not OAuth. Add credentials directly.',
      'beehiiv',
    );
  }

  async exchangeCode(_code: string): Promise<OAuthTokenResponse> {
    throw new DistributionError(
      'Beehiiv uses API keys, not OAuth. Add credentials directly.',
      'beehiiv',
    );
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenResponse> {
    throw new DistributionError(
      'Beehiiv uses API keys. Token refresh is not applicable.',
      'beehiiv',
    );
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    const publicationId = credentials.metadata?.publicationId as string | undefined;
    if (!publicationId) {
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: 'Beehiiv post requires credentials.metadata.publicationId to be set',
      };
    }

    // Extract title from metadata or first line of text
    const title = (params.metadata?.title as string | undefined)
      ?? params.text.split('\n')[0].trim();

    const subtitle = (params.metadata?.subtitle as string | undefined) ?? '';

    // Beehiiv accepts HTML content; fall back to plain text wrapped in a paragraph
    const content = (params.metadata?.html as string | undefined)
      ?? `<p>${params.text.replace(/\n/g, '</p><p>')}</p>`;

    const status = (params.metadata?.status as 'draft' | 'published' | undefined) ?? 'draft';

    let response: Response;
    try {
      response = await fetch(
        `${BEEHIIV_API_BASE}/publications/${publicationId}/posts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            subtitle,
            content,
            status,
          }),
        },
      );
    } catch (err) {
      throw new DistributionError(
        `Beehiiv network error: ${err instanceof Error ? err.message : String(err)}`,
        'beehiiv',
      );
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'unknown error';
      }
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Beehiiv post failed (${response.status}): ${errorBody}`,
      };
    }

    const data = await response.json();
    const post = data.data ?? data;
    const postId: string = post.id ?? '';
    const webUrl: string = post.web_url ?? post.url ?? '';

    return {
      externalPostId: postId,
      externalUrl: webUrl,
      status: status === 'published' ? 'published' : 'scheduled',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const publicationId = credentials.metadata?.publicationId as string | undefined;
    if (!publicationId) {
      throw new DistributionError(
        'Beehiiv delete requires credentials.metadata.publicationId to be set',
        'beehiiv',
      );
    }

    const response = await fetch(
      `${BEEHIIV_API_BASE}/publications/${publicationId}/posts/${externalPostId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new DistributionError(
        `Beehiiv delete failed (${response.status})`,
        'beehiiv',
      );
    }
  }

  async getMetrics(
    _credentials: PlatformCredentials,
    _externalPostId: string,
  ): Promise<PlatformMetrics> {
    // TODO: Implement when Beehiiv metrics API endpoints are available
    // Relevant endpoint: GET /publications/{pubId}/posts/{postId}/stats
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
      const response = await fetch(`${BEEHIIV_API_BASE}/publications`, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
