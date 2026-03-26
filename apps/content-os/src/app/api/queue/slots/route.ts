/**
 * @crumb
 * id: queue-slots-api-routes
 * AREA: API
 * why: Manage individual queue slots—list upcoming scheduled posts, fill empty slots with approved derived assets, and update slot properties (reschedule, swap content, change status)
 * in: GET /?queueId&limit&offset → QueueSlot[]; POST body: {queueId, derivedAssetId, scheduledFor}; PATCH body: {slotId, scheduledFor?, derivedAssetId?, status?}
 * out: GET → {slots: QueueSlot[], total: number}; POST → QueueSlot (201); PATCH → QueueSlot (200)
 * err: 400 on missing required params; 400 on Zod schema failure; 404 on slot not found for PATCH; 500 on DB error
 * hazard: GET without queueId returns user's slots across all queues—no ownership check on queueId param; caller can query another user's queue slots if they guess the UUID
 * hazard: POST derivedAssetId not validated against approval status at route layer—unapproved assets can be manually slotted (service layer does not enforce this for direct fills)
 * hazard: PATCH status field accepts any QueueSlotStatus string—no transition guard, so 'published' can be set without an actual distribution job
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
  const { request } = ctx;
  const searchParams = request.nextUrl.searchParams;
  const queueId = searchParams.get('queueId');
  const { limit, offset } = parsePagination(searchParams);

  const supabase = createServiceClient();

  let query = supabase
    .from('queue_slots')
    .select(
      `
      *,
      derived_assets (id, title, body, asset_type, platform_hint)
    `,
      { count: 'exact' },
    )
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
  const { body } = ctx;

  const supabase = createServiceClient();

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

// PATCH /api/queue/slots — Update an existing slot (reschedule, swap content, change status)
export const PATCH = withApiHandler<z.infer<typeof updateSlotSchema>>(async (ctx) => {
  const { body } = ctx;
  const { slotId, ...updates } = body;

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

  const supabase = createServiceClient();

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
