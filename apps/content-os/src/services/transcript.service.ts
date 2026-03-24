/**
 * Transcript service using Deepgram Nova-2.
 *
 * Provides word-level timestamps critical for video clip extraction.
 * Falls back to plain text extraction when timestamps aren't needed.
 */

import type {
  ITranscriptService,
  TranscriptResult,
  TranscriptSegment,
} from './interfaces/transcript.service';

export class DeepgramTranscriptService implements ITranscriptService {
  private apiKey: string;
  private baseUrl = 'https://api.deepgram.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.DEEPGRAM_API_KEY ?? '';
    if (!this.apiKey) {
      console.warn('[TranscriptService] No DEEPGRAM_API_KEY set — transcription will fail');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transcribe(fileUrl: string, _mimeType: string): Promise<TranscriptResult> {
    const response = await fetch(`${this.baseUrl}/listen`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: fileUrl,
        model: 'nova-2',
        language: 'en',
        smart_format: true,
        paragraphs: true,
        utterances: true,
        diarize: true,
        punctuate: true,
        // Word-level timestamps for clip extraction
        timestamps: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Deepgram transcription failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  private parseResponse(data: DeepgramResponse): TranscriptResult {
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative) {
      throw new Error('No transcription results returned from Deepgram');
    }

    // Build word-level segments
    const segments: TranscriptSegment[] = [];
    const words = alternative.words ?? [];

    // Group words into sentence-like segments using punctuation
    let currentSegment: { words: DeepgramWord[]; text: string } = { words: [], text: '' };

    for (const word of words) {
      currentSegment.words.push(word);
      currentSegment.text += (currentSegment.text ? ' ' : '') + word.punctuated_word;

      // Split on sentence-ending punctuation
      if (word.punctuated_word.match(/[.!?]$/)) {
        if (currentSegment.words.length > 0) {
          const first = currentSegment.words[0];
          const last = currentSegment.words[currentSegment.words.length - 1];
          segments.push({
            text: currentSegment.text.trim(),
            startMs: Math.round(first.start * 1000),
            endMs: Math.round(last.end * 1000),
            confidence: average(currentSegment.words.map((w) => w.confidence)),
          });
        }
        currentSegment = { words: [], text: '' };
      }
    }

    // Flush remaining words
    if (currentSegment.words.length > 0) {
      const first = currentSegment.words[0];
      const last = currentSegment.words[currentSegment.words.length - 1];
      segments.push({
        text: currentSegment.text.trim(),
        startMs: Math.round(first.start * 1000),
        endMs: Math.round(last.end * 1000),
        confidence: average(currentSegment.words.map((w) => w.confidence)),
      });
    }

    const durationMs = data.metadata?.duration
      ? Math.round(data.metadata.duration * 1000)
      : segments.length > 0
        ? segments[segments.length - 1].endMs
        : 0;

    return {
      fullText: alternative.transcript ?? '',
      segments,
      language: data.metadata?.language ?? 'en',
      durationMs,
    };
  }
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Deepgram response types (subset)
interface DeepgramWord {
  word: string;
  punctuated_word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

interface DeepgramResponse {
  metadata?: {
    duration?: number;
    language?: string;
  };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: DeepgramWord[];
      }>;
    }>;
  };
}
