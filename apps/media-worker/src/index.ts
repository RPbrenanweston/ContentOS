/**
 * Content OS — Media Worker
 *
 * Long-running Bun process that polls media_processing_jobs for pending work
 * and dispatches to the appropriate job handler.
 *
 * Job types implemented:
 *   normalize       — EBU R128 two-pass audio normalization (FFmpeg)
 *   transcribe      — speech-to-text via OpenAI Whisper API
 *   generate_waveform — peak amplitude extraction for the audio player
 *
 * Job types stubbed (infrastructure in place, implementations pending):
 *   trim, add_intro_outro, extract_clip, extract_chapters,
 *   generate_audiogram, convert_format
 *
 * Concurrency: MAX_CONCURRENT jobs run in parallel. Additional pending jobs
 * wait until a slot is free.
 */

import { claimNextJob, completeJob, failJob, uploadToStorage } from './db';
import type { MediaJob } from './db';
import { normalize } from './jobs/normalize';
import { transcribe } from './jobs/transcribe';
import { generateWaveform } from './jobs/waveform';

// ─── Config ──────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;  // How often to look for new jobs
const MAX_CONCURRENT   = 3;       // Max parallel FFmpeg processes
const OUTPUT_BUCKET    = 'media-processed';

// ─── Concurrency Semaphore ───────────────────────────────

let activeJobs = 0;

// ─── Dispatcher ──────────────────────────────────────────

async function processJob(job: MediaJob): Promise<void> {
  console.log(`[worker] Starting job ${job.id} type=${job.job_type}`);
  activeJobs++;

  try {
    switch (job.job_type) {
      case 'normalize': {
        const outputBuffer = await normalize(job);
        const outputPath = `${job.user_id}/${job.id}/normalized.mp3`;
        const url = await uploadToStorage(
          OUTPUT_BUCKET,
          outputPath,
          outputBuffer,
          'audio/mpeg',
        );
        await completeJob(job.id, url);
        break;
      }

      case 'transcribe': {
        const transcript = await transcribe(job);
        // Store transcript as a .vtt text file
        const outputPath = `${job.user_id}/${job.id}/transcript.vtt`;
        const url = await uploadToStorage(
          OUTPUT_BUCKET,
          outputPath,
          Buffer.from(transcript, 'utf8'),
          'text/vtt',
        );
        await completeJob(job.id, url);
        break;
      }

      case 'generate_waveform': {
        const peaksJson = await generateWaveform(job);
        const outputPath = `${job.user_id}/${job.id}/waveform.json`;
        const url = await uploadToStorage(
          OUTPUT_BUCKET,
          outputPath,
          Buffer.from(peaksJson, 'utf8'),
          'application/json',
        );
        await completeJob(job.id, url);
        break;
      }

      // ── Stubbed job types ───────────────────────────────
      case 'trim':
      case 'add_intro_outro':
      case 'extract_clip':
      case 'extract_chapters':
      case 'generate_audiogram':
      case 'convert_format':
        await failJob(job.id, `Job type '${job.job_type}' is not yet implemented`);
        break;

      default: {
        const _exhaustive: never = job.job_type;
        await failJob(job.id, `Unknown job type: ${_exhaustive}`);
      }
    }

    console.log(`[worker] Completed job ${job.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Failed job ${job.id}:`, message);
    await failJob(job.id, message);
  } finally {
    activeJobs--;
  }
}

// ─── Poll Loop ────────────────────────────────────────────

async function tick(): Promise<void> {
  if (activeJobs >= MAX_CONCURRENT) return;

  const job = await claimNextJob();
  if (!job) return;

  // Don't await — run concurrently
  processJob(job);
}

console.log(`[worker] Media worker starting (concurrency=${MAX_CONCURRENT}, poll=${POLL_INTERVAL_MS}ms)`);

setInterval(tick, POLL_INTERVAL_MS);
tick(); // Run immediately on startup
