import { spawnSync } from 'bun';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, unlinkSync } from 'node:fs';
import type { MediaJob } from '../db';
import { updateJobProgress } from '../db';

// ─── EBU R128 Normalization ───────────────────────────────
//
// Two-pass loudnorm: pass 1 measures the file, pass 2 applies
// the gain to hit -16 LUFS (Apple Podcasts / Spotify standard).
//
// Requires: ffmpeg installed (available in the Docker image)

const TARGET_LUFS = -16;
const TARGET_LRA = 11;
const TARGET_TP = -1.5; // true peak dBFS

interface LoudnormStats {
  input_i: string;
  input_lra: string;
  input_tp: string;
  input_thresh: string;
  target_offset: string;
}

/**
 * Two-pass EBU R128 normalization using FFmpeg's loudnorm filter.
 * Downloads the input from `job.input_url`, normalizes, and returns
 * the output file as a Buffer for the caller to upload.
 */
export async function normalize(job: MediaJob): Promise<Buffer> {
  const workDir = tmpdir();
  const ext = job.input_url.split('.').pop() ?? 'mp3';
  const inputPath = join(workDir, `${job.id}_input.${ext}`);
  const outputPath = join(workDir, `${job.id}_output.mp3`);

  // ── Step 1: Download input ──────────────────────────────
  const response = await fetch(job.input_url);
  if (!response.ok) {
    throw new Error(`Failed to download input: HTTP ${response.status}`);
  }
  const inputBuffer = await response.arrayBuffer();
  await Bun.write(inputPath, inputBuffer);

  await updateJobProgress(job.id, 10);

  // ── Step 2: Pass 1 — measure loudness ──────────────────
  const pass1 = spawnSync([
    'ffmpeg', '-i', inputPath,
    '-af', `loudnorm=I=${TARGET_LUFS}:LRA=${TARGET_LRA}:TP=${TARGET_TP}:print_format=json`,
    '-f', 'null', '-',
  ], { stderr: 'pipe' });

  const pass1Output = new TextDecoder().decode(pass1.stderr);
  const statsMatch = pass1Output.match(/\{[^}]+\}/s);
  if (!statsMatch) {
    throw new Error('loudnorm pass 1 failed to produce measurement JSON');
  }

  const stats: LoudnormStats = JSON.parse(statsMatch[0]);
  await updateJobProgress(job.id, 40);

  // ── Step 3: Pass 2 — apply normalization ────────────────
  const loudnormFilter = [
    `loudnorm=I=${TARGET_LUFS}`,
    `LRA=${TARGET_LRA}`,
    `TP=${TARGET_TP}`,
    `measured_I=${stats.input_i}`,
    `measured_LRA=${stats.input_lra}`,
    `measured_TP=${stats.input_tp}`,
    `measured_thresh=${stats.input_thresh}`,
    `offset=${stats.target_offset}`,
    'linear=true',
    'print_format=summary',
  ].join(':');

  const pass2 = spawnSync([
    'ffmpeg', '-i', inputPath,
    '-af', loudnormFilter,
    '-c:a', 'libmp3lame',
    '-q:a', '2',          // VBR ~190kbps
    '-ar', '44100',
    '-ac', '2',
    outputPath,
  ]);

  if (pass2.exitCode !== 0) {
    throw new Error(`FFmpeg pass 2 failed with exit code ${pass2.exitCode}`);
  }

  await updateJobProgress(job.id, 85);

  // ── Step 4: Read output and clean up ────────────────────
  const outputBuffer = readFileSync(outputPath);

  try { unlinkSync(inputPath); } catch { /* best-effort cleanup */ }
  try { unlinkSync(outputPath); } catch { /* best-effort cleanup */ }

  return outputBuffer;
}
