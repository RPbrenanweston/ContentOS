import { PROFILE_URL, POSTS_URL, MEDIA_UPLOAD_URL, API_VERSION_HEADER } from './config';
import type { TokenSet } from '../types';
import { PlatformError } from '../types';

// ─── Shared Helpers ───────────────────────────────────────

function authHeaders(credentials: TokenSet): Record<string, string> {
  return {
    Authorization: `Bearer ${credentials.accessToken}`,
    'LinkedIn-Version': API_VERSION_HEADER,
  };
}

async function handleApiError(
  response: Response,
  code: string,
  context: string,
): Promise<never> {
  const raw = await response.json().catch(() => null);

  throw new PlatformError(
    code,
    `${context}: ${response.status} ${response.statusText}`,
    'linkedin',
    response.status === 429 || response.status >= 500,
    undefined,
    raw,
  );
}

// ─── User Info ────────────────────────────────────────────

/**
 * Fetch the authenticated user's profile via the OpenID Connect userinfo endpoint.
 */
export async function getUserInfo(
  credentials: TokenSet,
): Promise<{
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}> {
  const response = await fetch(PROFILE_URL, {
    method: 'GET',
    headers: authHeaders(credentials),
  });

  if (!response.ok) {
    return handleApiError(response, 'USER_INFO_FAILED', 'Failed to get user info');
  }

  const data = await response.json();
  return {
    id: data.sub,
    name: data.name,
    email: data.email,
    profileImageUrl: data.picture,
  };
}

// ─── Text Post ────────────────────────────────────────────

export async function createTextPost(
  params: {
    authorUrn: string;
    text: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  },
  credentials: TokenSet,
): Promise<{ postUrn: string }> {
  const { authorUrn, text, visibility = 'PUBLIC' } = params;

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  };

  const response = await fetch(POSTS_URL, {
    method: 'POST',
    headers: {
      ...authHeaders(credentials),
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return handleApiError(response, 'POST_CREATE_FAILED', 'Failed to create LinkedIn post');
  }

  // LinkedIn returns the URN in the x-restli-id header or the id field
  const postUrn = response.headers.get('x-restli-id') ?? (await response.json()).id;
  return { postUrn };
}

// ─── Media Registration ───────────────────────────────────

export async function registerMediaUpload(
  params: {
    authorUrn: string;
    mediaType: 'IMAGE' | 'VIDEO';
  },
  credentials: TokenSet,
): Promise<{
  asset: string;
  uploadUrl: string;
}> {
  const { authorUrn, mediaType } = params;

  const recipe =
    mediaType === 'IMAGE'
      ? 'urn:li:digitalmediaRecipe:feedshare-image'
      : 'urn:li:digitalmediaRecipe:feedshare-video';

  const body = {
    registerUploadRequest: {
      recipes: [recipe],
      owner: authorUrn,
      serviceRelationships: [
        {
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        },
      ],
    },
  };

  const response = await fetch(MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      ...authHeaders(credentials),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return handleApiError(
      response,
      'MEDIA_REGISTER_FAILED',
      'Failed to register media upload',
    );
  }

  const data = await response.json();
  const uploadMechanism = data.value.uploadMechanism;
  const uploadUrl =
    uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
      .uploadUrl;
  const asset = data.value.asset;

  return { asset, uploadUrl };
}

// ─── Binary Media Upload ──────────────────────────────────

/**
 * Upload binary media data to LinkedIn's pre-signed upload URL.
 * No Authorization header needed — the URL is pre-signed.
 */
export async function uploadMediaBinary(
  uploadUrl: string,
  data: Buffer,
  mimeType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: new Uint8Array(data),
  });

  if (!response.ok) {
    throw new PlatformError(
      'MEDIA_UPLOAD_FAILED',
      `Media binary upload failed: ${response.status} ${response.statusText}`,
      'linkedin',
      response.status >= 500,
    );
  }
}

// ─── Post With Image ──────────────────────────────────────

export async function createPostWithMedia(
  params: {
    authorUrn: string;
    text: string;
    assetUrns: string[];
    altTexts?: (string | undefined)[];
    mediaCategory: 'IMAGE' | 'VIDEO';
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  },
  credentials: TokenSet,
): Promise<{ postUrn: string }> {
  const {
    authorUrn,
    text,
    assetUrns,
    altTexts = [],
    mediaCategory,
    visibility = 'PUBLIC',
  } = params;

  const media = assetUrns.map((urn, i) => ({
    status: 'READY',
    description: { text: altTexts[i] ?? '' },
    media: urn,
    title: { text: '' },
  }));

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: mediaCategory,
        media,
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  };

  const response = await fetch(POSTS_URL, {
    method: 'POST',
    headers: {
      ...authHeaders(credentials),
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return handleApiError(
      response,
      'POST_CREATE_FAILED',
      'Failed to create LinkedIn post with media',
    );
  }

  const postUrn = response.headers.get('x-restli-id') ?? (await response.json()).id;
  return { postUrn };
}

// ─── Post Deletion ────────────────────────────────────────

export async function deletePost(
  postUrn: string,
  credentials: TokenSet,
): Promise<void> {
  const encodedUrn = encodeURIComponent(postUrn);
  const url = `https://api.linkedin.com/v2/ugcPosts/${encodedUrn}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(credentials),
  });

  if (!response.ok) {
    return handleApiError(response, 'POST_DELETE_FAILED', 'Failed to delete LinkedIn post');
  }
}
