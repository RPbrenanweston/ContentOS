/**
 * @crumb
 * id: queue-slots-api-routes
 * AREA: API
 * why: Manage individual queue slots—list upcoming scheduled posts, fill empty slots with approved derived assets, and update slot properties (reschedule, swap content, change status)
 * in: GET /?queueId&limit&offset → QueueSlot[]; POST body: {queueId, derivedAssetId, scheduledFor}; PATCH body: {slotId, scheduledFor?, derivedAssetId?, status?}
 * out: GET → {slots: QueueSlot[], total: number}; POST → QueueSlot (201); PATCH → QueueSlot (200)
 * err: 400 on missing required params; 400 on Zod schema failure; 404 on slot not found for PATCH; 500 on DB error
 * hazard: (MITIGATED) GET now filters slots via inner join on publishing_queues.user_id; queueId ownership verified before query
 * hazard: (MITIGATED) POST validates derivedAssetId approval status before slotting; queue ownership verified
 * hazard: (MITIGATED) PATCH enforces valid status transitions via VALID_STATUS_TRANSITIONS map; ownership verified via parent queue
 * edge: READS queue_slots, derived_assets (joined), publishing_queues tables
 * edge: WRITES queue_slots table (insert for POST, update for PATCH)
 * edge: CALLED_BY queue/page.tsx (slot management UI)
 * edge: RELATES_TO services/queue.service.ts (previewSlots, autoFillSlots use same tables)
 * prompt: Add queueId ownership check; validate derivedAssetId status is 'approved' on POST; enforce valid status transitions on PATCH; test missing slotId returns 400
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { parsePagination } from '@/lib/pagination';

const fillSlotSchema = z.object({
  queueId: z.string().uuid(),
  derivedAssetId: z.string().uuid(),
  scheduledFor: z.string().datetime(),
});

const updateSlotSchema = z.object({
  slotId: z.string().uuid(),
  scheduledFor: z.string().datetime().optional(),
  derivedAssetId: z.string().uuid().optional(),
  status: z.enum(['empty', 'filled', 'published', 'skipped']).optional(),
});

// GET /api/queue/slots — List queue slots with their linked asset info
export const GET = withApiHandler(async (ctx) => {
  const { userId, request } = ctx;

  if (!userId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Missing authenticated user' },
      { status: 400 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const queueId = searchParams.get('queueId');
  const { limit, offset } = parsePagination(searchParams);

  const supabase = createServiceClient();

  // If a specific queueId is provided, verify ownership first
  if (queueId) {
    const { data: queue, error: queueError } = await supabase
      .from('publishing_queues')
      .select('id')
      .eq('id', queueId)
      .eq('user_id', userId)
      .single();

    if (queueError || !queue) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Queue not found or not owned by user' },
        { status: 400 },
      );
    }
  }

  // Build query scoped to user's queues only
  let query = supabase
    .from('queue_slots')
    .select(
      `
      *,
      derived_assets (id, title, body, asset_type, platform_hint),
      publishing_queues!inner (user_id)
    `,
      { count: 'exact' },
    )
    .eq('publishing_queues.user_id', userId)
    .gte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .range(offset, offset + limit - 1);

  if (queueId) {
    query = query.eq('publishing_queue_id', queueId);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const slots = (data ?? []).map(mapSlot);
  const total = count ?? slots.length;
  const headers = new Headers();
  headers.set('x-total-count', String(total));

  return NextResponse.json({ slots, total }, { headers });
});

// POST /api/queue/slots — Fill a slot with a derived asset
export const POST = withApiHandler<z.infer<typeof fillSlotSchema>>(async (ctx) => {
  const { userId, body } = ctx;

  if (!userId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Missing authenticated user' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Verify the queue belongs to the authenticated user
  const { data: queue, error: queueError } = await supabase
    .from('publishing_queues')
    .select('id')
    .eq('id', body.queueId)
    .eq('user_id', userId)
    .single();

  if (queueError || !queue) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Queue not found or not owned by user' },
      { status: 400 },
    );
  }

  // Verify the derived asset exists and is approved
  const { data: asset, error: assetError } = await supabase
    .from('derived_assets')
    .select('id, status')
    .eq('id', body.derivedAssetId)
    .single();

  if (assetError || !asset) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Derived asset not found' },
      { status: 400 },
    );
  }

  if (asset.status !== 'approved') {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Only approved assets can be slotted for publishing' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('queue_slots')
    .insert({
      publishing_queue_id: body.queueId,
      derived_asset_id: body.derivedAssetId,
      scheduled_for: body.scheduledFor,
      status: 'filled',
    })
    .select(
      `
      *,
      derived_assets (id, title, body, asset_type, platform_hint)
    `,
    )
    .single();

  if (error) throw error;

  return NextResponse.json(mapSlot(data), { status: 201 });
}, { schema: fillSlotSchema });

// Valid status transitions: which statuses can move to which
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  empty: ['filled', 'skipped'],
  filled: ['empty', 'published', 'skipped'],
  published: [], // terminal — cannot be changed
  skipped: ['empty', 'filled'],
};

// PATCH /api/queue/slots — Update an existing slot (reschedule, swap content, change status)
export const PATCH = withApiHandler<z.infer<typeof updateSlotSchema>>(async (ctx) => {
  const { userId, body } = ctx;
  const { slotId, ...updates } = body;

  if (!userId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Missing authenticated user' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Fetch the existing slot and verify ownership via the parent queue
  const { data: existing, error: fetchError } = await supabase
    .from('queue_slots')
    .select('id, status, publishing_queue_id, publishing_queues!inner (user_id)')
    .eq('id', slotId)
    .single();

  if (fetchError || !existing) {
    if (fetchError?.code === 'PGRST116' || !existing) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Slot not found' },
        { status: 404 },
      );
    }
    throw fetchError;
  }

  // Ownership check: the parent queue must belong to the authenticated user
  const queueOwner = (existing.publishing_queues as unknown as Record<string, unknown>)?.user_id;
  if (queueOwner !== userId) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Slot not found' },
      { status: 404 },
    );
  }

  // Status transition guard
  if (updates.status !== undefined) {
    const currentStatus = existing.status as string;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(updates.status)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Cannot transition slot from '${currentStatus}' to '${updates.status}'`,
        },
        { status: 400 },
      );
    }
  }

  // Build only the fields that were provided
  const patch: Record<string, unknown> = {};
  if (updates.scheduledFor !== undefined) patch.scheduled_for = updates.scheduledFor;
  if (updates.derivedAssetId !== undefined) {
    patch.derived_asset_id = updates.derivedAssetId;
    // If we're assigning an asset, promote empty slots to filled
    if (!updates.status) patch.status = 'filled';
  }
  if (updates.status !== undefined) patch.status = updates.status;
  // Clear derived asset when status is explicitly reset to empty
  if (updates.status === 'empty') patch.derived_asset_id = null;

  const { data, error } = await supabase
    .from('queue_slots')
    .update(patch)
    .eq('id', slotId)
    .select(
      `
      *,
      derived_assets (id, title, body, asset_type, platform_hint)
    `,
    )
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Not Found', message: 'Slot not found' },
        { status: 404 },
      );
    }
    throw error;
  }

  return NextResponse.json(mapSlot(data));
}, { schema: updateSlotSchema });

// ---------------------------------------------------------------------------
// Mapping helper
// ---------------------------------------------------------------------------

function mapSlot(raw: Record<string, unknown>) {
  const asset = raw.derived_assets as Record<string, unknown> | null;
  return {
    id: raw.id,
    publishingQueueId: raw.publishing_queue_id,
    queueScheduleId: raw.queue_schedule_id,
    derivedAssetId: raw.derived_asset_id,
    scheduledFor: raw.scheduled_for,
    status: raw.status,
    distributionJobId: raw.distribution_job_id,
    metadata: raw.metadata ?? {},
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    asset: asset
      ? {
          id: asset.id,
          title: asset.title,
          body: asset.body,
          assetType: asset.asset_type,
          platformHint: asset.platform_hint,
        }
      : undefined,
  };
}
