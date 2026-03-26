/**
 * @crumb
 * id: validation-schemas
 * AREA: INF
 * why: Define Zod schemas for input validation—enforce constraints on content nodes, assets, clips, and queue operations
 * in: User request bodies (ContentNode creation, asset update, clip extraction, publish actions)
 * out: Zod schemas: createContentNodeSchema, updateContentNodeSchema, createDerivedAssetSchema, updateDerivedAssetSchema, publishAssetSchema, clipExtractionSchema, listContentNodesSchema
 * err: Zod validation enforced at API boundary; schema mismatches return 400 Bad Request
 * hazard: clipExtractionSchema requires endMs positive but no constraint endMs > startMs—schema validation passes, extraction fails at ffmpeg level
 * hazard: maxLength field on createDerivedAssetSchema positive constraint permits tiny values (0.0001)—asset generation truncates text unpredictably
 * edge: ENFORCED_BY API route handlers (not shown) before service layer invocation
 * edge: READS enums.ts (enum() validators for AssetType, Platform, JobStatus)
 * edge: GUARDS decomposition.service, asset-generator.service, distribution.service, media.service from malformed input
 * prompt: Test negative boundary values (startMs=-1, endMs=0); verify maxLength precision with fractional values; test enum() validation with typos; validate UUID format in segmentIds and assetId; test page/limit pagination defaults
 */

import { z } from 'zod';

// Content Node schemas
export const createContentNodeSchema = z.object({
  title: z.string().min(1).max(500),
  contentType: z.enum(['blog', 'video', 'audio']),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateContentNodeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(['draft', 'processing', 'ready', 'published', 'archived']).optional(),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Derived Asset schemas
export const createDerivedAssetSchema = z.object({
  contentNodeId: z.string().uuid(),
  assetType: z.enum(['social_post', 'clip', 'carousel', 'email_draft', 'blog_summary', 'thread']),
  platform: z.enum(['linkedin', 'x', 'youtube', 'tiktok', 'instagram', 'newsletter']).optional(),
  segmentIds: z.array(z.string().uuid()).optional(),
  tone: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
});

export const updateDerivedAssetSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(['generating', 'draft', 'approved', 'published', 'failed']).optional(),
});

// Distribution schemas
export const publishAssetSchema = z
  .object({
    assetId: z.string().uuid(),
    accountIds: z.array(z.string().uuid()).min(1),
    scheduledAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // If scheduledAt is not provided, allow it (immediate publish)
      if (!data.scheduledAt) {
        return true;
      }
      // Validate that scheduledAt is in the future
      const scheduledDate = new Date(data.scheduledAt);
      const now = new Date();
      return scheduledDate > now;
    },
    {
      message: 'scheduledAt must be a future date (ISO 8601 format)',
      path: ['scheduledAt'],
    },
  );

// Media schemas — max clip duration: 30 minutes
const MAX_CLIP_DURATION_MS = 1_800_000;

export const clipExtractionSchema = z
  .object({
    sourceUrl: z.string().url(),
    startMs: z.number().nonnegative(),
    endMs: z.number().positive(),
    format: z.enum(['mp4', 'webm']).optional(),
  })
  .refine((data) => data.endMs > data.startMs, {
    message: 'endMs must be greater than startMs',
    path: ['endMs'],
  })
  .refine((data) => data.endMs - data.startMs < MAX_CLIP_DURATION_MS, {
    message: 'Clip duration must be less than 30 minutes (1,800,000ms)',
    path: ['endMs'],
  });

// Query params
export const listContentNodesSchema = z.object({
  status: z.enum(['draft', 'processing', 'ready', 'published', 'archived']).optional(),
  type: z.enum(['blog', 'video', 'audio']).optional(),
  page: z.coerce.number().positive().optional().default(1),
  limit: z.coerce.number().positive().max(100).optional().default(20),
});
