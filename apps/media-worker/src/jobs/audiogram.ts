import { spawnSync } from 'bun';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import type { MediaJob } from '../db';
import { updateJobProgress } from '../db';

// ─── Audiogram Generation ─────────────────────────────────
//
// Produces a 1080×1080 MP4 audiogram suitable for Instagram, LinkedIn,
// and YouTube Shorts. Combines:
//   1. A background image (or solid colour if none provided)
//   2. Animated waveform (FFmpeg showwaves filter)
//   3. Audio track
//
// Params accepted in job.params:
//   backgroundUrl?:  string  - URL of a JPEG/PNG background image
//   backgroundColor?: string - hex colour fallback, default '#111111'
//   waveColor?:       string - hex waveform colour, default '#CBFF53' (lime)
//   duration?:        number - clip length in seconds (default: full audio)
//   startOffset?:     number - start time in seconds (default: 0)
//   width?:           number - output width (default: 1080)
//   height?:          number - output height (default: 1080)

const DEFAULTS = {
  waveColor: 'CBFF53',
  backgroundColor: '111111',
  width: 1080,
  height: 1080,
};

export async function generateAudiogram(job: MediaJob): Promise<Buffer> {
  const workDir = tmpdir();
  const ext = job.input_url.split('.').pop() ?? 'mp3';
  const inputPath = join(workDir, `${job.id}_audiogram_input.${ext}`);
  const outputPath = join(workDir, `${job.id}_audiogram.mp4`);

  const params = job.params as {
    backgroundUrl?: string;
    backgroundColor?: string;
    waveColor?: string;
    duration?: number;
    startOffset?: number;
    width?: number;
    height?: number;
  };

  const width  = params.width  ?? DEFAULTS.width;
  const height = params.height ?? DEFAULTS.height;
  const waveColor = (params.waveColor ?? DEFAULTS.waveColor).replace('#', '');
  const bgColor   = (params.backgroundColor ?? DEFAULTS.backgroundColor).replace('#', '');
  const startOffset = params.startOffset ?? 0;

  // ── Step 1: Download audio ──────────────────────────────
  const response = await fetch(job.input_url);
  if (!response.ok) throw new Error(`Failed to download: HTTP ${response.status}`);
  await Bun.write(inputPath, await response.arrayBuffer());

  await updateJobProgress(job.id, 10);

  // ── Step 2: Download background image (if provided) ─────
  let bgPath: string | null = null;
  if (params.backgroundUrl) {
    const bgExt = params.backgroundUrl.split('.').pop() ?? 'jpg';
    bgPath = join(workDir, `${job.id}_bg.${bgExt}`);
    const bgRes = await fetch(params.backgroundUrl);
    if (bgRes.ok) {
      await Bun.write(bgPath, await bgRes.arrayBuffer());
    } else {
      bgPath = null;
    }
  }

  await updateJobProgress(job.id, 20);

  // ── Step 3: Build FFmpeg filter graph ───────────────────
  //
  // Layout (bottom 25% of frame):
  //   [background] overlaid with waveform strip centered at 75% height
  //
  // Waveform occupies 100% width × 25% height of the output frame.

  const waveHeight = Math.round(height * 0.25);
  const waveY = Math.round(height * 0.7);

  let ffmpegArgs: string[];

  if (bgPath) {
    // With background image
    const trimFilter = params.duration
      ? `,trim=start=${startOffset}:duration=${params.duration},setpts=PTS-STARTPTS`
      : '';
    ffmpegArgs = [
      'ffmpeg',
      '-i', inputPath,
      '-i', bgPath,
      ...(params.duration
        ? ['-ss', String(startOffset), '-t', String(params.duration)]
        : params.startOffset ? ['-ss', String(startOffset)] : []),
      '-filter_complex', [
        // Scale background to output dimensions
        `[1:v]scale=${width}:${height},setsar=1[bg]`,
        // Waveform strip
        `[0:a]showwaves=s=${width}x${waveHeight}:mode=cline:rate=25:colors=0x${waveColor}[wave]`,
        // Overlay waveform on background
        `[bg][wave]overlay=0:${waveY}[v]`,
      ].join(';'),
      '-map', '[v]',
      '-map', '0:a',
      ...(params.duration ? ['-t', String(params.duration)] : []),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputPath,
    ];
  } else {
    // Solid colour background
    ffmpegArgs = [
      'ffmpeg',
      '-i', inputPath,
      ...(params.duration
        ? ['-ss', String(startOffset), '-t', String(params.duration)]
        : params.startOffset ? ['-ss', String(startOffset)] : []),
      '-filter_complex', [
        // Create solid background
        `color=c=${bgColor}:size=${width}x${height}:rate=25[bg]`,
        // Waveform strip
        `[0:a]showwaves=s=${width}x${waveHeight}:mode=cline:rate=25:colors=0x${waveColor}[wave]`,
        // Overlay
        `[bg][wave]overlay=0:${waveY}[v]`,
      ].join(';'),
      '-map', '[v]',
      '-map', '0:a',
      ...(params.duration ? ['-t', String(params.duration)] : []),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputPath,
    ];
  }

  await updateJobProgress(job.id, 30);

  const result = spawnSync(ffmpegArgs);
  if (result.exitCode !== 0) {
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`FFmpeg audiogram failed: ${stderr.slice(-500)}`);
  }

  await updateJobProgress(job.id, 88);

  const outputBuffer = readFileSync(outputPath);

  // Cleanup
  try { unlinkSync(inputPath); } catch { /* */ }
  try { unlinkSync(outputPath); } catch { /* */ }
  if (bgPath) try { unlinkSync(bgPath); } catch { /* */ }

  return outputBuffer;
}
