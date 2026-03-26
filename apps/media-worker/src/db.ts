import { createClient } from '@supabase/supabase-js';

// ─── Supabase Client ─────────────────────────────────────
//
// The media worker uses the service-role key so it can read/write
// media_processing_jobs and distribution_accounts regardless of RLS.

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
);

// ─── Types ───────────────────────────────────────────────

export type JobType =
  | 'normalize'
  | 'trim'
  | 'add_intro_outro'
  | 'extract_clip'
  | 'generate_waveform'
  | 'transcribe'
  | 'extract_chapters'
  | 'generate_audiogram'
  | 'convert_format';

export interface MediaJob {
  id: string;
  user_id: string;
  content_node_id: string | null;
  job_type: JobType;
  input_url: string;
  params: Record<string, unknown>;
  output_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message: string | null;
}

// ─── Job Queries ─────────────────────────────────────────

/**
 * Claim a pending job atomically by setting status → 'processing' and
 * started_at. Returns null if no job is available.
 *
 * Uses a CTE-based update so the row is claimed in one round-trip,
 * preventing two worker instances from picking the same job.
 */
export async function claimNextJob(): Promise<MediaJob | null> {
  // Supabase JS doesn't support CTEs natively; use rpc or direct update.
  // Strategy: SELECT the oldest pending job, then UPDATE it with a
  // WHERE status='pending' check. The update returns the row only if
  // the race was won (affected rows = 1).
  const { data: candidates } = await supabase
    .from('media_processing_jobs')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (!candidates || candidates.length === 0) return null;

  const { data, error } = await supabase
    .from('media_processing_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', candidates[0].id)
    .eq('status', 'pending') // race-condition guard
    .select()
    .single();

  if (error || !data) return null;

  return data as MediaJob;
}

export async function updateJobProgress(id: string, progress: number): Promise<void> {
  await supabase
    .from('media_processing_jobs')
    .update({ progress })
    .eq('id', id);
}

export async function completeJob(id: string, outputUrl: string): Promise<void> {
  await supabase
    .from('media_processing_jobs')
    .update({
      status: 'completed',
      output_url: outputUrl,
      progress: 100,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function failJob(id: string, errorMessage: string): Promise<void> {
  await supabase
    .from('media_processing_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/**
 * Upload a local file buffer to Supabase Storage and return the public URL.
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  data: Uint8Array,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, data, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}
