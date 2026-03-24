import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { publishAssetSchema } from '@/lib/validation';

// POST /api/distribution/publish — Publish or schedule an asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = publishAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { assetRepo, accountRepo, distributionService } = getServices(supabase);

    // Load the asset
    const asset = await assetRepo.findById(parsed.data.assetId);

    // Load the selected accounts
    const allAccounts = await Promise.all(
      parsed.data.accountIds.map((id) => accountRepo.findById(id)),
    );

    // Publish via distribution service
    const jobs = await distributionService.publish({
      asset,
      accounts: allAccounts,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
      mediaUrls: asset.mediaUrl ? [asset.mediaUrl] : undefined,
    });

    return NextResponse.json({ jobs }, { status: 201 });
  } catch (error) {
    console.error('POST /api/distribution/publish error:', error);
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 });
  }
}
