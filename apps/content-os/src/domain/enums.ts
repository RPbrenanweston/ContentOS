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
  | 'reddit';

export type JobStatus =
  | 'pending'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';
