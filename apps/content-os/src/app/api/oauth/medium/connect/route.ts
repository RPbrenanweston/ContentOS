import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { DistributionAccountRepo } from '@/infrastructure/supabase/repositories/distribution-account.repo';
import { encryptToken } from '@/lib/token-encryption';

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
    const { integrationToken } = body as { integrationToken: string };

    if (!integrationToken) {
      return Response.json(
        { error: 'Integration token is required' },
        { status: 400 },
      );
    }

    // Validate token against Medium API
    let validationRes: Response;
    try {
      validationRes = await fetch('https://api.medium.com/v1/me', {
        headers: { Authorization: `Bearer ${integrationToken}` },
      });
    } catch {
      return Response.json(
        { error: 'Invalid integration token' },
        { status: 401 },
      );
    }

    if (!validationRes.ok) {
      return Response.json(
        { error: 'Invalid integration token' },
        { status: 401 },
      );
    }

    const { data } = await validationRes.json();

    // Store the account using service client (bypasses RLS)
    const serviceClient = createServiceClient();
    const accountRepo = new DistributionAccountRepo(serviceClient);

    await accountRepo.create({
      userId: user.id,
      platform: 'medium',
      accountName: data.name || data.username,
      externalAccountId: data.id,
      metadata: {
        integration_token: encryptToken(integrationToken),
      },
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { error: `Failed to connect Medium: ${message}` },
      { status: 500 },
    );
  }
}
