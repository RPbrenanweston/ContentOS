// @crumb queue-workers-job-handlers
// JOB | Async processors | Pipeline stages
// why: Execute multi-stage content decomposition asynchronously (transcription → AI segmentation → persistence) with fault tolerance and retry semantics
// in:[PgBoss.Job<ContentDecomposeJob>] out:[ContentSegment rows, updated ContentNode status] err:[TranscriptionError|AIError|ConstraintError|RetryableError]
// hazard: Partial job failure (transcription succeeds, decomposition fails) leaves transcript stored but segments missing; status stuck in processing
// hazard: segmentRepo.deleteByNodeId() + createMany() not atomic; concurrent job retry can create duplicate/orphaned segments
// edge:../pg-boss.ts -> CALLED_BY
// edge:../../app/api/distribution/publish/route.ts -> AWAITS
// prompt: Wrap delete+create in transaction or use upsert; implement idempotency key for retries; add circuit breaker for Deepgram quota exhaustion

/**
 * Queue workers for async content processing.
 *
 * Pipeline: content-decompose job →
 *   1. If video/audio: transcribe via Deepgram
 *   2. Decompose via AI into segments
 *   3. Persist segments to DB
 *   4. Update node status to 'ready'
 */

import type PgBoss from 'pg-boss';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { withTransaction } from '@/infrastructure/supabase/transaction';
import { getServices } from '@/services/container';
import { QUEUES, type ContentDecomposeJob, type ClipExtractJob, type DistributionPublishJob, type MetricsSyncJob } from './pg-boss';
import { AIDecompositionService } from '@/services/decomposition.service';
import { DeepgramTranscriptService } from '@/services/transcript.service';
import { getAdapter, type PlatformCredentials } from '@/infrastructure/distribution/platform-adapter';
import { aiClient } from '@/lib/ai';

export async function registerWorkers(boss: PgBoss): Promise<void> {
  await boss.work<ContentDecomposeJob>(
    QUEUES.CONTENT_DECOMPOSE,
    { teamSize: 2, teamConcurrency: 1 },
    handleContentDecompose,
  );

  await boss.work<ClipExtractJob>(
    QUEUES.CLIP_EXTRACT,
    { teamSize: 1, teamConcurrency: 1 },
    handleClipExtract,
  );

  await boss.work<DistributionPublishJob>(
    QUEUES.DISTRIBUTION_PUBLISH,
    { teamSize: 2, teamConcurrency: 1 },
    handleDistributionPublish,
  );

  await boss.work<MetricsSyncJob>(
    QUEUES.METRICS_SYNC,
    { teamSize: 1, teamConcurrency: 1 },
    handleMetricsSync,
  );

  // Schedule metrics sync every 6 hours
  await boss.schedule(QUEUES.METRICS_SYNC, '0 */6 * * *', {});

  logger.info('[workers] Registered content-decompose, clip-extract, distribution-publish, and metrics-sync workers');
}

async function handleContentDecompose(
  job: PgBoss.Job<ContentDecomposeJob>,
): Promise<void> {
  const { nodeId } = job.data;
  console.log(`[decompose] Starting for node ${nodeId}`);

  const supabase = createServiceClient();
  const { contentNodeRepo } = getServices(supabase);

  try {
    const node = await contentNodeRepo.findById(nodeId);

    // Step 1: Transcribe if video/audio
    let transcript: string | undefined;

    if ((node.contentType === 'video' || node.contentType === 'audio') && node.sourceUrl) {
      console.log(`[decompose] Transcribing ${node.contentType} for node ${nodeId}`);
      const transcriptService = new DeepgramTranscriptService();
      const result = await transcriptService.transcribe(
        node.sourceUrl,
        node.sourceMimeType ?? 'audio/mpeg',
      );
      transcript = result.fullText;

      // Store transcript as bodyText
      await contentNodeRepo.update(nodeId, {
        bodyText: result.fullText,
        wordCount: result.fullText.split(/\s+/).filter(Boolean).length,
      });

      console.log(`[decompose] Transcription complete: ${result.segments.length} segments, ${result.durationMs}ms`);
    }

    // Step 2: Decompose content
    console.log(`[decompose] Running AI decomposition for node ${nodeId}`);
    const decompositionService = new AIDecompositionService(aiClient);

    // Reload node in case bodyText was updated
    const freshNode = await contentNodeRepo.findById(nodeId);
    const result = await decompositionService.decompose(freshNode, transcript);

    // Step 3: Clear old segments and persist new ones
    // Wrapped in withTransaction to signal atomic intent and centralise failure logging.
    // NOTE: Not true DB atomicity — see transaction.ts for migration path to RPC.
    const segmentsToCreate = result.segments.map((seg) => ({
      ...seg,
      contentNodeId: nodeId,
      title: seg.title ?? undefined,
      startMs: seg.startMs ?? undefined,
      endMs: seg.endMs ?? undefined,
      tags: seg.tags ?? [],
    }));

    await withTransaction(`delete-create-segments:${nodeId}`, async (client) => {
      const { segmentRepo: txSegmentRepo } = getServices(client);
      await txSegmentRepo.deleteByNodeId(nodeId);
      await txSegmentRepo.createMany(segmentsToCreate);
    });

    // Step 4: Update node status + summary
    await contentNodeRepo.update(nodeId, {
      status: 'ready',
      summary: result.summary,
    });

    console.log(
      `[decompose] Complete for node ${nodeId}: ${result.segments.length} segments extracted`,
    );
  } catch (error) {
    logger.error(`Failed for node ${nodeId}`, { nodeId, error: String(error) });

    // Mark as failed so the UI shows the error state
    try {
      await contentNodeRepo.update(nodeId, { status: 'draft' });
    } catch {
      // Best effort status reset
    }

    throw error; // pg-boss will retry
  }
}

async function handleClipExtract(
  job: PgBoss.Job<ClipExtractJob>,
): Promise<void> {
  const { nodeId, segmentId, sourceUrl, startMs, endMs } = job.data;
  logger.info(`[clip-extract] Starting clip for segment ${segmentId}`);

  const supabase = createServiceClient();
  const { assetRepo } = getServices(supabase);

  // Calculate duration
  const durationMs = endMs - startMs;
  const startSec = startMs / 1000;
  const durationSec = durationMs / 1000;

  // Create temp paths
  const os = await import('os');
  const path = await import('path');
  const fs = await import('fs/promises');
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `clip-${segmentId}-${Date.now()}.mp4`);

  try {
    // Extract clip using ffmpeg
    const ffmpeg = (await import('fluent-ffmpeg')).default;
    await new Promise<void>((resolve, reject) => {
      ffmpeg(sourceUrl)
        .setStartTime(startSec)
        .setDuration(durationSec)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    // Read the file and upload to Supabase storage
    const fileBuffer = await fs.readFile(outputPath);
    const storagePath = `clips/${nodeId}/${segmentId}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from('clips')
      .upload(storagePath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('clips')
      .getPublicUrl(storagePath);

    // Create derived asset record
    await assetRepo.create({
      contentNodeId: nodeId,
      assetType: 'clip',
      title: `Clip from segment ${segmentId}`,
      body: '',
      mediaUrl: urlData.publicUrl,
      sourceSegmentIds: [segmentId],
      metadata: { startMs, endMs, durationMs },
    });

    logger.info(`[clip-extract] Complete for segment ${segmentId}`);
  } catch (error) {
    logger.error(`[clip-extract] Failed for segment ${segmentId}`, { error: String(error) });
    throw error; // pg-boss will retry
  } finally {
    // Cleanup temp file
    try { await fs.unlink(outputPath); } catch { /* ignore cleanup errors */ }
  }
}

async function handleDistributionPublish(
  job: PgBoss.Job<DistributionPublishJob>,
): Promise<void> {
  const { jobId, assetId, accountId } = job.data;
  logger.info(`[publish] Starting publish for job ${jobId}`);

  const supabase = createServiceClient();
  const { jobRepo, accountRepo, assetRepo } = getServices(supabase);

  try {
    // 1. Update job status to publishing
    await jobRepo.updateStatus(jobId, 'publishing');

    // 2. Load the derived asset
    const asset = await assetRepo.findById(assetId);

    // 3. Load account (repo layer decrypts OAuth tokens in metadata)
    const account = await accountRepo.findById(accountId);

    // 4. Get platform adapter
    const adapter = getAdapter(account.platform);
    if (!adapter) {
      throw new Error(`No adapter available for platform: ${account.platform}`);
    }

    // 5. Build credentials from account entity
    // OAuth tokens are stored encrypted in metadata and decrypted by the repo layer
    const credentials: PlatformCredentials = {
      accessToken: String(account.metadata?.access_token ?? ''),
      refreshToken: account.metadata?.refresh_token
        ? String(account.metadata.refresh_token)
        : undefined,
      platformAccountId: account.externalAccountId,
      metadata: account.metadata,
    };

    const postParams = {
      text: asset.body ?? '',
      mediaUrls: asset.mediaUrl ? [asset.mediaUrl] : undefined,
    };

    // 6. Publish via platform adapter
    const result = await adapter.createPost(credentials, postParams);

    // 7. Update job based on result
    if (result.status === 'published' || result.status === 'scheduled') {
      await jobRepo.updateStatus(jobId, result.status, {
        externalPostId: result.externalPostId,
        externalPostUrl: result.externalUrl,
        publishedAt: new Date().toISOString(),
      });
    } else {
      await jobRepo.updateStatus(jobId, 'failed', {
        errorMessage: result.errorMessage ?? 'Unknown publish failure',
      });
    }

    logger.info(`[publish] Complete for job ${jobId}: ${result.status}`);
  } catch (error) {
    logger.error(`[publish] Failed for job ${jobId}`, { error: String(error) });

    // Update job as failed — best effort
    try {
      await jobRepo.updateStatus(jobId, 'failed', {
        errorMessage: String(error),
      });
    } catch {
      // Best effort status update
    }

    throw error; // pg-boss will retry
  }
}

async function handleMetricsSync(
  job: PgBoss.Job<MetricsSyncJob>,
): Promise<void> {
  const { distributionJobId } = job.data;
  console.log(`[metrics-sync] Starting for distribution job ${distributionJobId}`);

  const supabase = createServiceClient();
  const { distributionService, jobRepo } = getServices(supabase);

  try {
    // Verify the job exists and is published
    const distributionJob = await jobRepo.findById(distributionJobId);
    if (distributionJob.status !== 'published' || !distributionJob.externalPostId) {
      console.log(`[metrics-sync] Skipping job ${distributionJobId} — not published or no external post`);
      return;
    }

    const metrics = await distributionService.fetchMetrics(distributionJobId);
    console.log(
      `[metrics-sync] Complete for job ${distributionJobId}: ${metrics.impressions} impressions, ${metrics.clicks} clicks, ${metrics.likes} likes`,
    );
  } catch (error) {
    logger.error(`[metrics-sync] Failed for job ${distributionJobId}`, {
      distributionJobId,
      error: String(error),
    });
    throw error; // pg-boss will retry
  }
}
