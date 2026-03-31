import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo';
import { encryptToken } from '@/lib/token-encryption';

function generateGhostJWT(apiKey: string): string {
  const colonIdx = apiKey.indexOf(':');
  const id = apiKey.slice(0, colonIdx);
  const secret = apiKey.slice(colonIdx + 1);

  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }),
  ).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' }),
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${sig}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { siteUrl: rawSiteUrl, adminApiKey } = body as {
      siteUrl: string;
      adminApiKey: string;
    };

    if (!rawSiteUrl || !adminApiKey) {
      return Response.json(
        { error: 'Site URL and Admin API Key are required' },
        { status: 400 },
      );
    }

    if (!adminApiKey.includes(':')) {
      return Response.json(
        { error: 'Admin API key must be in "id:secret" format' },
        { status: 400 },
      );
    }

    const siteUrl = rawSiteUrl.replace(/\/+$/, '');

    // Generate JWT and validate against Ghost Admin API
    const jwt = generateGhostJWT(adminApiKey);

    let validationRes: Response;
    try {
      validationRes = await fetch(
        `${siteUrl}/ghost/api/admin/settings/?limit=1`,
        {
          headers: { Authorization: `Ghost ${jwt}` },
        },
      );
    } catch {
      return Response.json(
        { error: 'Invalid API key or site URL' },
        { status: 401 },
      );
    }

    if (!validationRes.ok) {
      return Response.json(
        { error: 'Invalid API key or site URL' },
        { status: 401 },
      );
    }

    // Store the account using service client (bypasses RLS)
    const serviceClient = createServiceClient();
    const accountRepo = new DistributionAccountRepo(serviceClient);

    await accountRepo.create({
      userId: user.id,
      platform: 'ghost',
      accountName: siteUrl,
      externalAccountId: siteUrl,
      metadata: {
        admin_api_key: encryptToken(adminApiKey),
        api_url: siteUrl,
      },
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { error: `Failed to connect Ghost: ${message}` },
      { status: 500 },
    );
  }
}
