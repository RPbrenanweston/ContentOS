// @crumb substack-adapter-implementation
// API | Token auth | Draft post creation
// why: Implement Substack REST API adapter for publishing newsletter posts via API token authentication
// in:[PlatformCredentials with accessToken (API token) and metadata.publicationUrl] out:[Substack draft post id and URL] err:[SubstackAuthError|HttpError]
// hazard: Substack has no public metrics API — getMetrics always returns zeroed stubs
// hazard: publicationUrl must be set in credentials.metadata or createPost fails with clear error
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY
// prompt: Add publicationUrl presence check at adapter construction; test token expiry; document metrics stub limitation

/**
 * Substack API adapter.
 *
 * Uses Substack's REST API for draft post creation.
 * Authentication via API token in Authorization header (not OAuth).
 * getAuthUrl/exchangeCode are not applicable — Substack uses API tokens
 * obtained directly from the publication settings dashboard.
 *
 * API docs: https://substack.com/api/v1 (unofficial, reverse-engineered)
 * Publication URL format: https://{slug}.substack.com
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

export class SubstackAdapter implements PlatformAdapter {
  readonly platform: Platform = 'substack';
  readonly displayName = 'Substack';

  // Substack does not use OAuth client credentials
  // API tokens are obtained from the publication dashboard

  getAuthUrl(_state: string): string {
    throw new Error('Substack uses API tokens, not OAuth');
  }

  async exchangeCode(_code: string): Promise<OAuthTokenResponse> {
    throw new Error('Substack uses API tokens, not OAuth');
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenResponse> {
    throw new Error('Substack uses API tokens, not OAuth');
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    const publicationUrl = credentials.metadata?.publicationUrl as string | undefined;
    if (!publicationUrl) {
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: 'Substack post requires credentials.metadata.publicationUrl (e.g. https://yourpub.substack.com)',
      };
    }

    // Split text: first line becomes title, rest becomes the HTML body
    const lines = params.text.split('\n');
    const title = lines[0].trim();
    const bodyHtml = lines.slice(1).join('\n').trim();
    const subtitle = (params.metadata?.subtitle as string | undefined) ?? '';

    const apiBase = publicationUrl.replace(/\/$/, '');

    const response = await fetch(`${apiBase}/api/v1/drafts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draft_title: title,
        draft_subtitle: subtitle,
        draft_body: bodyHtml,
        draft_section_id: null,
        audience: 'everyone',
        type: 'newsletter',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Substack post failed (${response.status}): ${err}`,
      };
    }

    const data = await response.json();
    const postId = String(data.id ?? '');
    const slug = data.slug ?? postId;

    return {
      externalPostId: postId,
      externalUrl: `${apiBase}/p/${slug}`,
      status: 'published',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const publicationUrl = credentials.metadata?.publicationUrl as string | undefined;
    if (!publicationUrl) {
      throw new Error('Substack delete requires credentials.metadata.publicationUrl');
    }

    const apiBase = publicationUrl.replace(/\/$/, '');

    const response = await fetch(`${apiBase}/api/v1/posts/${externalPostId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Substack delete failed: ${response.status}`);
    }
  }

  async getMetrics(
    _credentials: PlatformCredentials,
    _externalPostId: string,
  ): Promise<PlatformMetrics> {
    // TODO: Substack has no public metrics API — stub returns zeroes.
    // If Substack exposes analytics endpoints in the future, implement here.
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
    const publicationUrl = credentials.metadata?.publicationUrl as string | undefined;
    if (!publicationUrl) return false;

    try {
      const apiBase = publicationUrl.replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/v1/publications`, {
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
