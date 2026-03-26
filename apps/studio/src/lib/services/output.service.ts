// @crumb output-service
// DOM | async-job-orchestration | database-state-machine
// why: Fire-and-forget job processor that manages output lifecycle (pending → processing → ready/failed) with progress tracking and error handling
// in:[createOutputJob params with type/breadcrumbId/compilationId] out:[outputId jobId] err:[DB insert errors, missing job payload, missing breadcrumbs, FFmpeg failures]
// hazard: Unhandled promise rejection if processJob throws; errors logged but not surfaced to client
// hazard: Race condition if job record queried before committed (progress updates may read stale data)
// edge:./media-processor.ts -> CALLS (extractClip, compileClips)
// edge:../supabase/server.ts -> CALLS (studio_outputs, studio_jobs, studio_breadcrumbs tables)
// edge:../../utils/validation.ts -> RELATES (validates output request schema)
// prompt: Add promise rejection handler with exponential backoff retry; implement transaction-style job creation to prevent race conditions

import { createServerClient } from '@/lib/supabase/server';
import { extractClip, compileClips } from './media-processor';

/**
 * Create an output + job record, then process it asynchronously.
 */
export async function createOutputJob(params: {
  type: 'clip' | 'post' | 'compilation';
  breadcrumbId?: string;
  compilationId?: string;
}): Promise<{ outputId: string; jobId: string }> {
  const supabase = createServerClient();

  // Create output record
  const { data: output, error: outputError } = await supabase
    .from('studio_outputs')
    .insert({
      breadcrumb_id: params.breadcrumbId ?? null,
      compilation_id: params.compilationId ?? null,
      type: params.type,
      status: 'pending',
    })
    .select()
    .single();

  if (outputError || !output) {
    throw new Error(`Failed to create output: ${outputError?.message}`);
  }

  // Determine job type
  const jobType = params.type === 'clip'
    ? 'extract_clip'
    : params.type === 'compilation'
      ? 'compile_video'
      : 'generate_post';

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('studio_jobs')
    .insert({
      output_id: output.id,
      type: jobType,
      status: 'pending',
      payload: {
        breadcrumbId: params.breadcrumbId,
        compilationId: params.compilationId,
      },
    })
    .select()
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to create job: ${jobError?.message}`);
  }

  // Fire-and-forget: process the job
  processJob(job.id, output.id, jobType).catch((err) => {
    console.error(`Job ${job.id} failed:`, err);
  });

  return { outputId: output.id, jobId: job.id };
}

/**
 * Process a job asynchronously. Updates job + output status as it runs.
 */
async function processJob(jobId: string, outputId: string, jobType: string): Promise<void> {
  const supabase = createServerClient();

  // Mark as processing
  await supabase.from('studio_jobs').update({
    status: 'processing',
    started_at: new Date().toISOString(),
    progress: 10,
  }).eq('id', jobId);

  await supabase.from('studio_outputs').update({
    status: 'processing',
  }).eq('id', outputId);

  try {
    if (jobType === 'extract_clip') {
      await processClipExtraction(jobId, outputId, supabase);
    } else if (jobType === 'compile_video') {
      await processCompilation(jobId, outputId, supabase);
    } else if (jobType === 'generate_post') {
      await processPostGeneration(jobId, outputId, supabase);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await supabase.from('studio_jobs').update({
      status: 'failed',
      error_message: message,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    await supabase.from('studio_outputs').update({
      status: 'failed',
      error_message: message,
    }).eq('id', outputId);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processClipExtraction(jobId: string, outputId: string, supabase: any) {
  // Get the job payload to find the breadcrumb
  const { data: job } = await supabase
    .from('studio_jobs')
    .select('payload')
    .eq('id', jobId)
    .single();

  const breadcrumbId = job?.payload?.breadcrumbId;
  if (!breadcrumbId) throw new Error('Missing breadcrumbId in job payload');

  // Get breadcrumb + video info
  const { data: breadcrumb } = await supabase
    .from('studio_breadcrumbs')
    .select('*, studio_videos(*)')
    .eq('id', breadcrumbId)
    .single();

  if (!breadcrumb) throw new Error('Breadcrumb not found');

  const video = breadcrumb.studio_videos;
  if (!video?.file_url) throw new Error('Video has no file URL');

  // Extract storage path from the file URL
  const storagePath = extractStoragePath(video.file_url, 'studio-videos');

  await supabase.from('studio_jobs').update({ progress: 30 }).eq('id', jobId);

  // Run FFmpeg extraction
  const result = await extractClip({
    videoStoragePath: storagePath,
    startSeconds: Number(breadcrumb.start_time_seconds),
    endSeconds: Number(breadcrumb.end_time_seconds),
  });

  await supabase.from('studio_jobs').update({ progress: 90 }).eq('id', jobId);

  // Update output with result
  await supabase.from('studio_outputs').update({
    status: 'ready',
    file_url: result.publicUrl,
  }).eq('id', outputId);

  await supabase.from('studio_jobs').update({
    status: 'completed',
    progress: 100,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processCompilation(jobId: string, outputId: string, supabase: any) {
  const { data: job } = await supabase
    .from('studio_jobs')
    .select('payload')
    .eq('id', jobId)
    .single();

  const compilationId = job?.payload?.compilationId;
  if (!compilationId) throw new Error('Missing compilationId in job payload');

  // Get compilation breadcrumbs in order
  const { data: compBreadcrumbs } = await supabase
    .from('studio_compilation_breadcrumbs')
    .select('*, studio_breadcrumbs(*, studio_videos(*))')
    .eq('compilation_id', compilationId)
    .order('order_index', { ascending: true });

  if (!compBreadcrumbs?.length) throw new Error('No breadcrumbs in compilation');

  await supabase.from('studio_jobs').update({ progress: 20 }).eq('id', jobId);

  const clips = compBreadcrumbs.map((cb: { studio_breadcrumbs: { studio_videos: { file_url: string }; start_time_seconds: string; end_time_seconds: string } }) => {
    const bc = cb.studio_breadcrumbs;
    const video = bc.studio_videos;
    return {
      videoStoragePath: extractStoragePath(video.file_url, 'studio-videos'),
      startSeconds: Number(bc.start_time_seconds),
      endSeconds: Number(bc.end_time_seconds),
    };
  });

  const result = await compileClips({ clips });

  await supabase.from('studio_outputs').update({
    status: 'ready',
    file_url: result.publicUrl,
  }).eq('id', outputId);

  await supabase.from('studio_jobs').update({
    status: 'completed',
    progress: 100,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processPostGeneration(jobId: string, outputId: string, supabase: any) {
  const { data: job } = await supabase
    .from('studio_jobs')
    .select('payload')
    .eq('id', jobId)
    .single();

  const breadcrumbId = job?.payload?.breadcrumbId;
  if (!breadcrumbId) throw new Error('Missing breadcrumbId in job payload');

  const { data: breadcrumb } = await supabase
    .from('studio_breadcrumbs')
    .select('note, tags')
    .eq('id', breadcrumbId)
    .single();

  if (!breadcrumb?.note) throw new Error('Breadcrumb has no note to generate from');

  // Simple post generation (placeholder — Phase 5 will use AI)
  const textContent = `${breadcrumb.note}\n\n${(breadcrumb.tags as string[]).map((t: string) => `#${t}`).join(' ')}`.trim();

  await supabase.from('studio_outputs').update({
    status: 'ready',
    text_content: textContent,
  }).eq('id', outputId);

  await supabase.from('studio_jobs').update({
    status: 'completed',
    progress: 100,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);
}

/**
 * Extract the storage path from a Supabase public URL.
 */
function extractStoragePath(publicUrl: string, bucket: string): string {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) {
    // Fallback: try to use the path after the bucket name
    const parts = publicUrl.split(`/${bucket}/`);
    return parts[parts.length - 1];
  }
  return publicUrl.substring(idx + marker.length);
}
