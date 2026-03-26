// @crumb distribution-publish-orchestration
// API | workflow-orchestration | multi-platform-posting
// why: Orchestrate asset posting to multiple platforms simultaneously; creates distribution jobs, enqueues async delivery, returns job statuses for tracking
// in:[assetId, accountIds[], scheduledAt?] out:[DistributionJob[]] err:[asset-not-found, invalid-accounts, publish-failed]
// hazard: Promise.all on accountRepo.findById could fail silently on missing account; partial account load leaves orphaned jobs
// hazard: No auth check on accountIds; user can post to accounts owned by other users if they guess the ID
// hazard: distributionService.publish doesn't validate that selected accounts support the asset type (e.g., video to text-only platform)
// hazard: scheduledAt validation missing; accepts any date string including past dates, causing immediate or erratic scheduling
// hazard: mediaUrl fallback to [asset.mediaUrl] could pass null/undefined to adapters expecting valid URLs; platform adapters crash on null media
// edge:../../../infrastructure/supabase/repositories/derived-asset.repo.ts -> LOADS
// edge:../../../infrastructure/supabase/repositories/distribution-account.repo.ts -> LOADS
// edge:../../../services/distribution.service.ts -> ENQUEUES
// edge:../jobs/route.ts -> RELATED (status query)
// edge:../accounts/route.ts -> REFERENCES
// prompt: Add auth ownership check on accounts; validate account+asset type compatibility; validate scheduledAt is future; validate mediaUrl not null before passing to adapters; sanitize error responses
//
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { publishAssetSchema } from '@/lib/validation';
import { ForbiddenError } from '@/lib/errors';

// POST /api/distribution/publish — Publish or schedule an asset
export const POST = withApiHandler<z.infer<typeof publishAssetSchema>>(async (ctx) => {
  const { body, userId } = ctx;

  const supabase = createServiceClient();
  const { assetRepo, accountRepo, distributionService } = getServices(supabase);

  // Load the asset
  const asset = await assetRepo.findById(body.assetId);

  // Load the selected accounts
  const allAccounts = await Promise.all(
    body.accountIds.map((id: string) => accountRepo.findById(id)),
  );

  // Verify the caller owns every requested distribution account
  const unauthorizedAccounts = allAccounts.filter((account) => account.userId !== userId);
  if (unauthorizedAccounts.length > 0) {
    throw new ForbiddenError('You do not have permission to publish to one or more of the selected accounts');
  }

  // Publish via distribution service
  const jobs = await distributionService.publish({
    asset,
    accounts: allAccounts,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    mediaUrls: asset.mediaUrl ? [asset.mediaUrl] : undefined,
  });

  return NextResponse.json({ jobs }, { status: 201 });
}, { schema: publishAssetSchema });
