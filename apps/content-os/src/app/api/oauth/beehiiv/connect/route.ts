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
    const { apiKey, publicationId } = body as {
      apiKey: string;
      publicationId: string;
    };

    if (!apiKey || !publicationId) {
      return Response.json(
        { error: 'API Key and Publication ID are required' },
        { status: 400 },
      );
    }

    // Validate credentials against Beehiiv API
    let validationRes: Response;
    try {
      validationRes = await fetch(
        `https://api.beehiiv.com/v2/publications/${publicationId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );
    } catch {
      return Response.json(
        { error: 'Invalid API key or publication ID' },
        { status: 401 },
      );
    }

    if (!validationRes.ok) {
      return Response.json(
        { error: 'Invalid API key or publication ID' },
        { status: 401 },
      );
    }

    const validationData = await validationRes.json();
    const pubName: string = validationData.data?.name || publicationId;

    // Store the account using service client (bypasses RLS)
    const serviceClient = createServiceClient();
    const accountRepo = new DistributionAccountRepo(serviceClient);

    await accountRepo.create({
      userId: user.id,
      platform: 'beehiiv',
      accountName: pubName,
      externalAccountId: publicationId,
      metadata: {
        api_key: encryptToken(apiKey),
        publication_id: publicationId,
      },
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { error: `Failed to connect beehiiv: ${message}` },
      { status: 500 },
    );
  }
}
