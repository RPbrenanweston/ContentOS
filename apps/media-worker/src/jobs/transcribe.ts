import { spawnSync } from 'bun';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, unlinkSync } from 'node:fs';
import type { MediaJob } from '../db';
import { updateJobProgress } from '../db';

// ─── Transcription via Whisper API ───────────────────────
//
// Sends the audio file to OpenAI Whisper (whisper-1) and returns
// a VTT transcript string. If the file is >25 MB (Whisper API limit),
// it first extracts a mono 16kHz WAV using FFmpeg to reduce size.
//
// Params accepted in job.params:
//   language?: string   - ISO 639-1 (e.g. "en"). Auto-detected if omitted.
//   format?:  string    - "vtt" | "srt" | "json" (default: "vtt")

const WHISPER_API = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_BYTES = 24 * 1024 * 1024; // 24 MB — stay under the 25 MB limit

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export async function transcribe(job: MediaJob): Promise<string> {
  const workDir = tmpdir();
  const ext = job.input_url.split('.').pop() ?? 'mp3';
  const inputPath = join(workDir, `${job.id}_transcript_input.${ext}`);
  const compressedPath = join(workDir, `${job.id}_transcript_compressed.wav`);

  const format = (job.params.format as string | undefined) ?? 'vtt';
  const language = job.params.language as string | undefined;

  // ── Step 1: Download input ──────────────────────────────
  const response = await fetch(job.input_url);
  if (!response.ok) throw new Error(`Failed to download: HTTP ${response.status}`);
  const inputBuffer = await response.arrayBuffer();
  await Bun.write(inputPath, inputBuffer);

  await updateJobProgress(job.id, 15);

  // ── Step 2: Compress if needed ─────────────────────────
  let audioPath = inputPath;
  if (inputBuffer.byteLength > MAX_BYTES) {
    spawnSync([
      'ffmpeg', '-i', inputPath,
      '-ar', '16000',   // 16 kHz
      '-ac', '1',        // mono
      '-c:a', 'pcm_s16le',
      compressedPath,
    ]);
    audioPath = compressedPath;
  }

  await updateJobProgress(job.id, 35);

  // ── Step 3: Send to Whisper API ────────────────────────
  const audioData = readFileSync(audioPath);
  const formData = new FormData();
  formData.append('file', new Blob([audioData], { type: 'audio/mpeg' }), 'audio.mp3');
  formData.append('model', 'whisper-1');
  formData.append('response_format', format);
  if (language) formData.append('language', language);

  const whisperRes = await fetch(WHISPER_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireEnv('OPENAI_API_KEY')}` },
    body: formData,
  });

  if (!whisperRes.ok) {
    const body = await whisperRes.text();
    throw new Error(`Whisper API error ${whisperRes.status}: ${body}`);
  }

  const transcript = await whisperRes.text();

  await updateJobProgress(job.id, 90);

  // Cleanup
  try { unlinkSync(inputPath); } catch { /* best-effort */ }
  try { unlinkSync(compressedPath); } catch { /* best-effort */ }

  return transcript;
}
