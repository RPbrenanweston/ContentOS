// @crumb media-processor
// DOM | video-transcoding | ffmpeg-integration
// why: Core media processing engine that extracts clips and compiles multi-segment videos using FFmpeg, with Supabase storage integration
// in:[videoStoragePath clips array] out:[MediaProcessorResult with publicUrl] err:[FFmpeg execution, storage upload, file system failures]
// hazard: FFmpeg spawning subprocess could hang if not properly constrained; temp files left behind on exception
// hazard: Large video files streamed to memory during buffer operations could cause OOM
// edge:../supabase/server.ts -> CALLS (download/upload from storage)
// edge:../../types/api.ts -> READS (uses ClipExtractionParams interface)
// prompt: Monitor temp directory cleanup on all exit paths; add timeout constraints to FFmpeg execFile calls

import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createServerClient } from '@/lib/supabase/server';

const execFileAsync = promisify(execFile);

export interface ClipExtractionParams {
  videoStoragePath: string;
  startSeconds: number;
  endSeconds: number;
}

export interface CompilationParams {
  clips: Array<{
    videoStoragePath: string;
    startSeconds: number;
    endSeconds: number;
  }>;
}

export interface MediaProcessorResult {
  storagePath: string;
  publicUrl: string;
  durationSeconds: number;
}

/**
 * Download a file from Supabase Storage to a temp path.
 */
async function downloadFromStorage(
  bucket: string,
  path: string,
  outputPath: string
): Promise<void> {
  const supabase = createServerClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Failed to download ${path}: ${error?.message}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  await writeFile(outputPath, buffer);
}

/**
 * Upload a file to Supabase Storage and return the public URL.
 */
async function uploadToStorage(
  bucket: string,
  storagePath: string,
  filePath: string,
  contentType: string
): Promise<string> {
  const supabase = createServerClient();
  const { readFile } = await import('fs/promises');
  const buffer = await readFile(filePath);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Failed to upload to ${storagePath}: ${error.message}`);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return urlData.publicUrl;
}

/**
 * Extract a clip from a video using FFmpeg.
 */
export async function extractClip(params: ClipExtractionParams): Promise<MediaProcessorResult> {
  const tempDir = await mkdtemp(join(tmpdir(), 'studio-clip-'));
  const inputPath = join(tempDir, 'input.mp4');
  const outputPath = join(tempDir, 'output.mp4');

  try {
    // Download source video
    await downloadFromStorage('studio-videos', params.videoStoragePath, inputPath);

    // Extract clip with FFmpeg
    // Use -ss before -i for fast input seeking, -c copy for stream copy
    const duration = params.endSeconds - params.startSeconds;
    await execFileAsync('ffmpeg', [
      '-ss', String(params.startSeconds),
      '-i', inputPath,
      '-t', String(duration),
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y',
      outputPath,
    ]);

    // Upload result
    const clipId = crypto.randomUUID();
    const storagePath = `clips/${clipId}.mp4`;
    const publicUrl = await uploadToStorage('studio-clips', storagePath, outputPath, 'video/mp4');

    return {
      storagePath,
      publicUrl,
      durationSeconds: duration,
    };
  } finally {
    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Compile multiple clips into a single video using FFmpeg concat demuxer.
 */
export async function compileClips(params: CompilationParams): Promise<MediaProcessorResult> {
  const tempDir = await mkdtemp(join(tmpdir(), 'studio-compile-'));
  const outputPath = join(tempDir, 'compilation.mp4');
  const clipPaths: string[] = [];

  try {
    // Extract each clip segment to temp files
    for (let i = 0; i < params.clips.length; i++) {
      const clip = params.clips[i];
      const clipInputPath = join(tempDir, `input-${i}.mp4`);
      const clipOutputPath = join(tempDir, `segment-${i}.mp4`);

      await downloadFromStorage('studio-videos', clip.videoStoragePath, clipInputPath);

      const duration = clip.endSeconds - clip.startSeconds;
      await execFileAsync('ffmpeg', [
        '-ss', String(clip.startSeconds),
        '-i', clipInputPath,
        '-t', String(duration),
        '-c', 'copy',
        '-movflags', '+faststart',
        '-y',
        clipOutputPath,
      ]);

      clipPaths.push(clipOutputPath);
      await unlink(clipInputPath).catch(() => {});
    }

    // Create concat file list
    const concatListPath = join(tempDir, 'filelist.txt');
    const filelistContent = clipPaths.map((p) => `file '${p}'`).join('\n');
    await writeFile(concatListPath, filelistContent);

    // Concatenate
    await execFileAsync('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y',
      outputPath,
    ]);

    // Upload result
    const compilationId = crypto.randomUUID();
    const storagePath = `compilations/${compilationId}.mp4`;
    const publicUrl = await uploadToStorage('studio-clips', storagePath, outputPath, 'video/mp4');

    // Calculate total duration
    const totalDuration = params.clips.reduce(
      (sum, c) => sum + (c.endSeconds - c.startSeconds),
      0
    );

    return {
      storagePath,
      publicUrl,
      durationSeconds: totalDuration,
    };
  } finally {
    // Cleanup all temp files
    for (const p of clipPaths) await unlink(p).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
