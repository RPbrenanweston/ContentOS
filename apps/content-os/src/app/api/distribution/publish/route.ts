// @crumb distribution-publish-orchestration
// API | workflow-orchestration | multi-platform-posting
// why: Orchestrate asset posting to multiple platforms simultaneously; creates distribution jobs, enqueues async delivery, returns job statuses for tracking
// in:[assetId, accountIds[], scheduledAt?] out:[DistributionJob[]] err:[asset-not-found, invalid-accounts, publish-failed]
// hazard: Promise.all on accountRepo.findById could fail silently on missing account; partial account load leaves orphaned jobs
// hazard: No auth check on accountIds; user can post to accounts owned by other users if they guess the ID
// hazard: distributionService.publish doesn't validate that selected accounts support the asset type (e.g., video to text-only platform)
// hazard: scheduledAt validation missing; accepts any date string including past dates, causing immediate or erratic scheduling
// hazard: mediaUrl fallback to [asset.mediaUrl] could pass null/undefined to adapters expecting valid URLs; platform adapters crash on null media
// hazard: Error response exposes full service errors; could leak API keys or rate limit information from platform adapters
// edge:../../../infrastructure/supabase/repositories/asset.repo.ts -> LOADS
// edge:../../../infrastructure/supabase/repositories/account.repo.ts -> LOADS
// edge:../../../services/distribution.service.ts -> ENQUEUES
// edge:../jobs/route.ts -> RELATED (status query)
// edge:../accounts/route.ts -> REFERENCES
// prompt: Add auth ownership check on accounts; validate account+asset type compatibility; validate scheduledAt is future; validate mediaUrl not null before passing to adapters; sanitize error responses
//
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
