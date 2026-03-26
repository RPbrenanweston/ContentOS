// ─── Content Types ──────────────────────────────────────

export type ContentType = 'blog' | 'image' | 'video' | 'audio' | 'podcast_episode';
export type ContentStatus = 'draft' | 'processing' | 'ready' | 'published' | 'archived';
export type EpisodeType = 'full' | 'trailer' | 'bonus';
export type ShowType = 'episodic' | 'serial';

export type SegmentType =
  | 'idea' | 'quote' | 'hook' | 'clip_candidate' | 'chapter'
  | 'key_point' | 'call_to_action' | 'story' | 'statistic';

export type AssetType =
  | 'social_post' | 'clip' | 'carousel' | 'audiogram'
  | 'quote_image' | 'thread' | 'newsletter_block' | 'blog_excerpt'
  | 'transcript_snippet' | 'show_notes_summary';

export type AssetStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'failed';

// ─── Platform Types ─────────────────────────────────────

export type PlatformType =
  | 'twitter' | 'linkedin' | 'instagram' | 'facebook'
  | 'threads' | 'tiktok' | 'youtube' | 'bluesky'
  | 'reddit' | 'medium' | 'substack' | 'ghost' | 'beehiiv';

export type DistributionStatus =
  | 'pending' | 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';

export type MediaJobType =
  | 'normalize' | 'trim' | 'add_intro_outro' | 'extract_clip'
  | 'generate_waveform' | 'transcribe' | 'extract_chapters'
  | 'generate_audiogram' | 'convert_format';

export type MediaJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ─── Database Row Types ─────────────────────────────────

export interface ContentNode {
  id: string;
  user_id: string;
  content_type: ContentType;
  status: ContentStatus;
  title: string;
  description: string | null;
  body: Record<string, unknown> | null;
  slug: string | null;
  media_url: string | null;
  media_duration_seconds: number | null;
  media_size_bytes: number | null;
  thumbnail_url: string | null;
  waveform_data: Record<string, unknown> | null;
  // Podcast-specific
  show_id: string | null;
  episode_number: number | null;
  season_number: number | null;
  episode_type: EpisodeType | null;
  explicit: boolean;
  transcript: TranscriptEntry[] | null;
  chapters: Chapter[] | null;
  show_notes: string | null;
  // Metadata
  tags: string[];
  canonical_url: string | null;
  og_image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface PodcastShow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  author: string;
  owner_name: string;
  owner_email: string;
  language: string;
  category: string;
  subcategory: string | null;
  artwork_url: string;
  feed_url: string | null;
  website_url: string | null;
  explicit: boolean;
  show_type: ShowType;
  copyright: string | null;
  imported_from_url: string | null;
  last_import_at: string | null;
  accent_color: string;
  custom_css: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface ContentSegment {
  id: string;
  content_node_id: string;
  segment_type: SegmentType;
  title: string | null;
  body: string;
  start_seconds: number | null;
  end_seconds: number | null;
  start_offset: number | null;
  end_offset: number | null;
  confidence: number | null;
  extraction_model: string | null;
  is_manual: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface DerivedAsset {
  id: string;
  content_node_id: string;
  segment_id: string | null;
  asset_type: AssetType;
  title: string | null;
  body: string | null;
  media_url: string | null;
  media_duration_seconds: number | null;
  target_platform: string | null;
  status: AssetStatus;
  generation_model: string | null;
  generation_prompt: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface DistributionAccount {
  id: string;
  user_id: string;
  platform: PlatformType;
  platform_account_id: string;
  platform_username: string | null;
  platform_display_name: string | null;
  platform_avatar_url: string | null;
  // Tokens are encrypted — only accessible via service role
  token_expires_at: string | null;
  token_scopes: string[];
  is_active: boolean;
  last_verified_at: string | null;
  last_error: string | null;
  consecutive_failures: number;
  rate_limit_remaining: number | null;
  rate_limit_reset_at: string | null;
  platform_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DistributionJob {
  id: string;
  user_id: string;
  derived_asset_id: string | null;
  content_node_id: string | null;
  account_id: string;
  scheduled_at: string | null;
  content_snapshot: Record<string, unknown>;
  status: DistributionStatus;
  platform_post_id: string | null;
  platform_post_url: string | null;
  published_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface MediaProcessingJob {
  id: string;
  user_id: string;
  content_node_id: string | null;
  job_type: MediaJobType;
  input_url: string;
  params: Record<string, unknown>;
  output_url: string | null;
  status: MediaJobStatus;
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ────────────────────────────────────────────

export interface TranscriptEntry {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface Chapter {
  start: number;
  title: string;
  url?: string;
  image?: string;
}
