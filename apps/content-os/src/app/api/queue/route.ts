/**
 * @crumb
 * id: queue-api-routes
 * AREA: API
 * why: Expose publishing queue management over HTTP—create recurring schedules tied to distribution accounts, list queues with account context for the queue UI page
 * in: GET /?limit&offset → PublishingQueue[]; POST body: {distributionAccountId, name?, timezone?, schedule: [{dayOfWeek, timeOfDay}]}
 * out: GET → {queues: PublishingQueue[], total: number}; POST → PublishingQueue (201)
 * err: 400 on missing distributionAccountId; 400 on invalid timezone; 400 on Zod schema failure; 500 on DB error
 * hazard: (MITIGATED) userId sourced from x-user-id header—empty userId now returns 400 before reaching DB
 * hazard: POST schedule array accepts empty []—creates a queue with no slots, which is valid but may confuse callers expecting at least one time slot
 * edge: READS publishing_queues, queue_schedules, distribution_accounts tables
 * edge: WRITES publishing_queues, queue_schedules tables via QueueService.createQueue
 * edge: USES lib/pagination.ts for limit/offset parsing
 * edge: USES lib/timezone.ts isValidTimezone for DST-safe timezone validation
 * edge: CALLED_BY queue/page.tsx (queue UI page)
 * prompt: Test POST with invalid timezone returns 400; test GET with no queues returns empty array; test pagination limits enforce MAX_LIMIT
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { parsePagination } from '@/lib/pagination';
import { QueueService } from '@/services/queue.service';

const DAY_OF_WEEK = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

const createQueueSchema = z.object({
  distributionAccountId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  timezone: z.string().optional(),
  schedule: z
    .array(
      z.object({
        dayOfWeek: DAY_OF_WEEK,
        timeOfDay: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'timeOfDay must be HH:MM format'),
      }),
    )
    .default([]),
});

// GET /api/queue — List publishing queues for the authenticated user
export const GET = withApiHandler(async (ctx) => {
  const { userId, request } = ctx;

  if (!userId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Missing authenticated user' },
      { status: 400 },
    );
  }

  const { limit, offset } = parsePagination(request.nextUrl.searchParams);

  const supabase = createServiceClient();
  const queueService = new QueueService(supabase);

  const queues = await queueService.getQueues(userId);

  // Apply pagination manually since getQueues fetches all (ordered by created_at desc)
  const total = queues.length;
  const page = queues.slice(offset, offset + limit);

  const headers = new Headers();
  headers.set('x-total-count', String(total));

  return NextResponse.json({ queues: page, total }, { headers });
});

// POST /api/queue — Create a new publishing queue with a recurring schedule
export const POST = withApiHandler<z.infer<typeof createQueueSchema>>(async (ctx) => {
  const { userId, body } = ctx;

  if (!userId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Missing authenticated user' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Verify the distribution account belongs to this user
  const { data: account, error: accountError } = await supabase
    .from('distribution_accounts')
    .select('id')
    .eq('id', body.distributionAccountId)
    .eq('user_id', userId)
    .single();

  if (accountError || !account) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Distribution account not found or not owned by user' },
      { status: 400 },
    );
  }

  const queueService = new QueueService(supabase);

  // Always use the authenticated userId — never trust the request body for ownership
  const queue = await queueService.createQueue({
    userId,
    distributionAccountId: body.distributionAccountId,
    name: body.name,
    timezone: body.timezone,
    schedules: body.schedule,
  });

  return NextResponse.json(queue, { status: 201 });
}, { schema: createQueueSchema });
