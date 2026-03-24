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
