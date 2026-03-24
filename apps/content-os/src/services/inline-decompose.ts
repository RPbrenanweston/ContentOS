// @crumb inline-decompose
// DOM | Content decomposition | Queue fallback | Video/audio transcription
// why: Synchronous fallback pipeline for decomposing content into segments when async queue (pg-boss) is unavailable
// in:[nodeId: string] out:[void (persists segments, updates node status)] err:[node not found, transcription failure, decomposition error]
// hazard: Transcription service called synchronously in request thread—large video files (500MB+) block server for minutes
// hazard: Error recovery resets status to 'draft' but doesn't cancel partial segment persists—database could have orphaned segments
// edge:../../services/decomposition.service.ts -> CALLS [AIDecompositionService.decompose for segment extraction]
// edge:../../services/transcript.service.ts -> CALLS [DeepgramTranscriptService for audio/video transcription]
// edge:../../services/container.ts -> READS [repository instances from container]
// edge:../../domain/content-node.ts -> WRITES [updates node status, bodyText, wordCount, summary]
// prompt: Add request timeout (30s max). Implement segment transaction rollback on error. Log partial states for debugging.

/**
 * Inline decomposition fallback.
 *
 * Used when pg-boss queue is unavailable (no SUPABASE_DB_URL).
 * Runs the same pipeline as the queue worker but inline.
 */

import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { AIDecompositionService } from '@/services/decomposition.service';
import { DeepgramTranscriptService } from '@/services/transcript.service';
import { aiClient } from '@/lib/ai';

export async function handleInlineDecompose(
  nodeId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { contentNodeRepo, segmentRepo } = getServices(supabase);

  try {
    const node = await contentNodeRepo.findById(nodeId);

    // Transcribe if video/audio
    let transcript: string | undefined;

    if ((node.contentType === 'video' || node.contentType === 'audio') && node.sourceUrl) {
      const transcriptService = new DeepgramTranscriptService();
      const result = await transcriptService.transcribe(
        node.sourceUrl,
        node.sourceMimeType ?? 'audio/mpeg',
      );
      transcript = result.fullText;

      await contentNodeRepo.update(nodeId, {
        bodyText: result.fullText,
        wordCount: result.fullText.split(/\s+/).filter(Boolean).length,
      });
    }

    // Decompose
    const decompositionService = new AIDecompositionService(aiClient);
    const freshNode = await contentNodeRepo.findById(nodeId);
    const result = await decompositionService.decompose(freshNode, transcript);

    // Persist segments
    await segmentRepo.deleteByNodeId(nodeId);

    const segmentsToCreate = result.segments.map((seg) => ({
      ...seg,
      contentNodeId: nodeId,
      title: seg.title ?? undefined,
      startMs: seg.startMs ?? undefined,
      endMs: seg.endMs ?? undefined,
      tags: seg.tags ?? [],
    }));

    await segmentRepo.createMany(segmentsToCreate);

    // Update status
    await contentNodeRepo.update(nodeId, {
      status: 'ready',
      summary: result.summary,
    });

    console.log(`[inline-decompose] Complete for node ${nodeId}`);
  } catch (error) {
    console.error(`[inline-decompose] Failed for node ${nodeId}:`, error);
    try {
      await contentNodeRepo.update(nodeId, { status: 'draft' });
    } catch {
      // Best effort
    }
  }
}
