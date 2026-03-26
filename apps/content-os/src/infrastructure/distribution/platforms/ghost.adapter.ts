// @crumb ghost-adapter-implementation
// API | JWT auth | Admin API key
// why: Implement Ghost Admin API adapter with JWT token generation from Admin API key (id:secret format)
// in:[PlatformCredentials with accessToken as id:secret, metadata.apiUrl] out:[Ghost post ID and URL] err:[DistributionError]
// hazard: JWT is short-lived (5min); generate fresh token per request to avoid clock skew failures
// hazard: Ghost Admin API key must be split on first ':' only — secrets may contain ':' characters
// edge:../platform-adapter.ts -> IMPLEMENTS
// edge:../../../../app/api/distribution/publish/route.ts -> CALLED_BY
// prompt: Handle Ghost self-hosted URL trailing slashes; validate metadata.apiUrl is present before all API calls
/**
 * Ghost Admin API adapter.
 *
 * Uses Ghost Admin API with JWT authentication generated from
 * an Admin API key in the format "id:secret".
 *
 * Ghost Admin API docs: https://ghost.org/docs/admin-api/
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

/**
 * Generate a Ghost Admin API JWT token from an Admin API key.
 *
 * The key is in "id:secret" format. The secret is hex-encoded and used
 * as an HMAC-SHA256 signing key. JWT header carries kid=id for key lookup.
 */
function generateGhostJwt(adminApiKey: string): string {
  const colonIndex = adminApiKey.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Ghost Admin API key must be in "id:secret" format');
  }

  const id = adminApiKey.slice(0, colonIndex);
  const secret = adminApiKey.slice(colonIndex + 1);

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'HS256',
    kid: id,
    typ: 'JWT',
  };

  const payload = {
    iat: now,
    exp: now + 300, // 5 minutes
    aud: '/admin/',
  };

  const encode = (obj: object): string =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Node.js built-in crypto — no external JWT library needed
  const crypto = require('crypto');
  const keyBuffer = Buffer.from(secret, 'hex');
  const signature = crypto
    .createHmac('sha256', keyBuffer)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signingInput}.${signature}`;
}

export class GhostAdapter implements PlatformAdapter {
  readonly platform: Platform = 'ghost';
  readonly displayName = 'Ghost';

  getAuthUrl(_state: string): string {
    throw new Error('Ghost uses Admin API keys, not OAuth. Add credentials directly.');
  }

  async exchangeCode(_code: string): Promise<OAuthTokenResponse> {
    throw new Error('Ghost uses Admin API keys, not OAuth. Add credentials directly.');
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenResponse> {
    throw new Error('Ghost uses Admin API keys, not OAuth. Tokens are generated per-request.');
  }

  async createPost(
    credentials: PlatformCredentials,
    params: PlatformPostParams,
  ): Promise<PlatformPostResult> {
    const apiUrl = this.resolveApiUrl(credentials);
    const jwt = generateGhostJwt(credentials.accessToken);

    const status = params.metadata?.status === 'published' ? 'published' : 'draft';
    const title = (params.metadata?.title as string | undefined) ?? params.text.slice(0, 100);
    const html = (params.metadata?.html as string | undefined) ?? `<p>${params.text}</p>`;

    let response: Response;
    try {
      response = await fetch(`${apiUrl}/ghost/api/admin/posts/`, {
        method: 'POST',
        headers: {
          Authorization: `Ghost ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          posts: [
            {
              title,
              html,
              status,
            },
          ],
        }),
      });
    } catch (err) {
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Ghost network error: ${String(err)}`,
      };
    }

    if (!response.ok) {
      const body = await response.text();
      return {
        externalPostId: '',
        externalUrl: '',
        status: 'failed',
        errorMessage: `Ghost post failed (${response.status}): ${body}`,
      };
    }

    const data = await response.json();
    const post = data.posts?.[0];
    const postId: string = post?.id ?? '';
    const postUrl: string = post?.url ?? '';

    return {
      externalPostId: postId,
      externalUrl: postUrl,
      status: post?.status === 'published' ? 'published' : 'scheduled',
    };
  }

  async deletePost(
    credentials: PlatformCredentials,
    externalPostId: string,
  ): Promise<void> {
    const apiUrl = this.resolveApiUrl(credentials);
    const jwt = generateGhostJwt(credentials.accessToken);

    const response = await fetch(`${apiUrl}/ghost/api/admin/posts/${externalPostId}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `Ghost ${jwt}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Ghost delete failed (${response.status})`);
    }
  }

  async getMetrics(
    _credentials: PlatformCredentials,
    _externalPostId: string,
  ): Promise<PlatformMetrics> {
    // TODO: Ghost does not expose a public post metrics API
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
      const apiUrl = this.resolveApiUrl(credentials);
      const jwt = generateGhostJwt(credentials.accessToken);

      const response = await fetch(`${apiUrl}/ghost/api/admin/site/`, {
        headers: {
          Authorization: `Ghost ${jwt}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private resolveApiUrl(credentials: PlatformCredentials): string {
    const raw = (credentials.metadata?.apiUrl as string | undefined) ?? '';
    // Strip trailing slash so we can always append paths cleanly
    return raw.replace(/\/$/, '');
  }
}
