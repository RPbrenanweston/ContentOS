/**
 * @crumb
 * id: enum-definitions
 * AREA: DAT
 * why: Define all domain enums—ContentNodeType, ContentNodeStatus, SegmentType, AssetType, AssetStatus, Platform, JobStatus—centralize allowed values for type safety
 * in: None (pure definitions)
 * out: 7 union types: ContentNodeType, ContentNodeStatus, SegmentType, AssetType, AssetStatus, Platform, JobStatus
 * err: No errors typed—enum values not enforced at boundary layers; typos in enum values accepted as valid strings
 * hazard: Platform enum includes 9 services (linkedin, x, youtube, tiktok, instagram, newsletter, bluesky, threads, reddit) but only 4 have tested adapters—unimplemented platforms cause silent distribution failures
 * hazard: AssetStatus includes 'failed' but no retry logic defined—failed assets stuck in limbo without manual intervention pathway
 * edge: USED_BY all entity files (content-node.ts, distribution.ts, etc.) via type imports
 * edge: ENFORCED_BY validation.ts schemas (zod enum() calls)
 * edge: DRIVER for adapter selection in distribution.service.ts (Platform → platform adapter mapping)
 * prompt: Test unsupported Platform enum values (bluesky, threads, reddit) for graceful fallback; verify AssetStatus='failed' has recovery pathway; validate enum value exhaustiveness in adapter switch statements
 */

export type ContentNodeType = 'blog' | 'video' | 'audio';

export type ContentNodeStatus =
  | 'draft'
  | 'processing'
  | 'ready'
  | 'published'
  | 'archived';

export type SegmentType =
  | 'idea'
  | 'quote'
  | 'hook'
  | 'clip_candidate'
  | 'chapter'
  | 'statistic'
  | 'story'
  | 'cta';

export type AssetType =
  | 'social_post'
  | 'clip'
  | 'carousel'
  | 'email_draft'
  | 'blog_summary'
  | 'thread';

export type AssetStatus =
  | 'generating'
  | 'draft'
  | 'approved'
  | 'published'
  | 'failed';

export type Platform =
  | 'linkedin'
  | 'x'
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'newsletter'
  | 'bluesky'
  | 'threads'
  | 'reddit'
  | 'substack'
  | 'beehiiv'
  | 'ghost'
  | 'medium';

export type JobStatus =
  | 'pending'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';
