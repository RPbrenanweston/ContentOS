// @crumb content-decompose-trigger
// API | job-orchestration | workflow-trigger
// why: Initiates content decomposition pipeline; validates content state before queueing async job to pg-boss with inline fallback
// in:[contentId:string, authUser] out:[JobId|status:processing] err:[node-not-found, invalid-state, queue-failure]
// hazard: No ID format validation on contentId parameter; accepts any string without UUID/slug validation
// hazard: Status transition rule (draft|ready→processing) embedded in handler; no domain-layer state machine; transitions could be inconsistent
// hazard: Queue failure triggers silent inline processing without retry mechanism; job loses durability, errors swallowed in fire-and-forget pattern
// hazard: Inline decompose fallback has no timeout; long-running decomposition blocks request indefinitely
// hazard: Job data doesn't include retryCount, priority, or deadletter routing; failed jobs disappear
// hazard: Node existence check uses findByIdOrSlug but doesn't validate content exists before enqueue (could queue empty job)
// edge:../../services/content-decompose.ts -> USES
// edge:../../infrastructure/queue/pg-boss.ts -> ENQUEUES
// edge:../../../domain/content.ts -> REFERENCES
// prompt: Add ID format validation; move status transitions to domain ContentNode state machine; implement queue retry policy with exponential backoff; add timeout to inline fallback; include job metadata (retryCount, priority); validate content before enqueue

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { getServices } from '@/services/container';
import { NotFoundError } from '@/lib/errors';
import { getQueue, QUEUES } from '@/infrastructure/queue/pg-boss';
import type { ContentDecomposeJob } from '@/infrastructure/queue/pg-boss';

// POST /api/content/[id]/process — Trigger content decomposition
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { contentNodeRepo } = getServices(supabase);

    // Verify node exists
    const node = await contentNodeRepo.findById(id);

    if (node.status !== 'draft' && node.status !== 'ready') {
      return NextResponse.json(
        { error: `Cannot process node in '${node.status}' state` },
        { status: 400 },
      );
    }

    // Validate there's content to process
    if (!node.bodyText && !node.bodyHtml && !node.sourceUrl) {
      return NextResponse.json(
        { error: 'Node has no content to process (no text, HTML, or source file)' },
        { status: 400 },
      );
    }

    // Update status to processing
    await contentNodeRepo.update(id, { status: 'processing' });

    // Enqueue decomposition job
    try {
      const queue = await getQueue();
      const jobData: ContentDecomposeJob = {
        nodeId: id,
        userId: node.userId,
      };
      await queue.send(QUEUES.CONTENT_DECOMPOSE, jobData);
    } catch (queueError) {
      // If queue isn't available (no DB URL), run inline as fallback
      console.warn('[process] Queue unavailable, will process inline:', queueError);
      // The inline fallback imports dynamically to avoid circular deps
      const { handleInlineDecompose } = await import('@/services/inline-decompose');
      // Fire-and-forget — don't block the response
      handleInlineDecompose(id).catch((err) => {
        console.error('[process] Inline decomposition failed:', err);
      });
    }

    return NextResponse.json({
      nodeId: id,
      status: 'processing',
      message: 'Decomposition queued',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('POST /api/content/[id]/process error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger processing' },
      { status: 500 },
    );
  }
}
