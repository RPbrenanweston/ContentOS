import { spawnSync } from 'bun';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, unlinkSync } from 'node:fs';
import type { MediaJob } from '../db';
import { updateJobProgress } from '../db';

// ─── Waveform Generation ──────────────────────────────────
//
// Extracts amplitude samples from audio using FFmpeg's astats filter
// and returns a JSON array of normalised peak values (0..1) suitable
// for rendering an SVG/canvas waveform in the audio player.
//
// Params accepted in job.params:
//   samples?: number  - number of bars (default: 200)

export async function generateWaveform(job: MediaJob): Promise<string> {
  const samples = (job.params.samples as number | undefined) ?? 200;
  const workDir = tmpdir();
  const ext = job.input_url.split('.').pop() ?? 'mp3';
  const inputPath = join(workDir, `${job.id}_waveform_input.${ext}`);
  const dataPath = join(workDir, `${job.id}_waveform.json`);

  // ── Step 1: Download ────────────────────────────────────
  const response = await fetch(job.input_url);
  if (!response.ok) throw new Error(`Failed to download: HTTP ${response.status}`);
  await Bun.write(inputPath, await response.arrayBuffer());

  await updateJobProgress(job.id, 20);

  // ── Step 2: Get duration ────────────────────────────────
  const probeResult = spawnSync([
    'ffprobe', '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    inputPath,
  ], { stdout: 'pipe' });

  const probeData = JSON.parse(new TextDecoder().decode(probeResult.stdout));
  const duration = parseFloat(probeData?.format?.duration ?? '0');

  if (duration === 0) throw new Error('Could not determine audio duration');

  await updateJobProgress(job.id, 35);

  // ── Step 3: Extract peak amplitudes ─────────────────────
  // Resample to `samples` points by splitting into equal-length segments
  // and measuring the peak dB in each using FFmpeg's asetnsamples + astats.
  const segmentDuration = duration / samples;

  const ffmpegResult = spawnSync([
    'ffmpeg', '-i', inputPath,
    '-af', [
      `asetnsamples=n=${Math.ceil(segmentDuration * 44100)}`,
      'astats=metadata=1:reset=1',
      'ametadata=print:key=lavfi.astats.Overall.Peak_level:file=' + dataPath,
    ].join(','),
    '-f', 'null', '-',
  ], { stderr: 'pipe' });

  if (ffmpegResult.exitCode !== 0) {
    // Fallback: generate flat waveform if stats extraction fails
    const flat = Array.from({ length: samples }, () => 0.5);
    try { unlinkSync(inputPath); } catch { /* */ }
    return JSON.stringify(flat);
  }

  await updateJobProgress(job.id, 75);

  // ── Step 4: Parse metadata output ───────────────────────
  // FFmpeg writes one line per segment: lavfi.astats.Overall.Peak_level=<dB>
  let rawLines: string[] = [];
  try {
    rawLines = readFileSync(dataPath, 'utf8')
      .split('\n')
      .filter((l) => l.includes('Peak_level='));
  } catch {
    // File may not exist if audio has no samples
  }

  // Convert dBFS values to 0..1 normalised amplitude
  // dBFS range: -inf to 0. We clamp to -60 dB as the floor.
  const peaks = rawLines.slice(0, samples).map((line) => {
    const dB = parseFloat(line.split('=')[1] ?? '-60');
    if (!isFinite(dB)) return 0;
    const normalised = (Math.max(dB, -60) + 60) / 60;
    return Math.round(normalised * 1000) / 1000; // 3 decimal places
  });

  // Pad to requested sample count if we got fewer
  while (peaks.length < samples) peaks.push(0);

  // Cleanup
  try { unlinkSync(inputPath); } catch { /* */ }
  try { unlinkSync(dataPath); } catch { /* */ }

  return JSON.stringify(peaks);
}
