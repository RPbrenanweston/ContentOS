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
import { createServiceClient } from '@/infrastructure/supabase/client';
import { withTransaction } from '@/infrastructure/supabase/transaction';
import { getServices } from '@/services/container';
import { QUEUES, type ContentDecomposeJob } from './pg-boss';
import { AIDecompositionService } from '@/services/decomposition.service';
import { DeepgramTranscriptService } from '@/services/transcript.service';
import { aiClient } from '@/lib/ai';

export async function registerWorkers(boss: PgBoss): Promise<void> {
  await boss.work<ContentDecomposeJob>(
    QUEUES.CONTENT_DECOMPOSE,
    { teamSize: 2, teamConcurrency: 1 },
    handleContentDecompose,
  );

  console.log('[workers] Registered content-decompose worker');
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
    console.error(`[decompose] Failed for node ${nodeId}:`, error);

    // Mark as failed so the UI shows the error state
    try {
      await contentNodeRepo.update(nodeId, { status: 'draft' });
    } catch {
      // Best effort status reset
    }

    throw error; // pg-boss will retry
  }
}
