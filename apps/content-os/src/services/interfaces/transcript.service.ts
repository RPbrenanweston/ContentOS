export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface TranscriptResult {
  fullText: string;
  segments: TranscriptSegment[];
  language: string;
  durationMs: number;
}

export interface ITranscriptService {
  transcribe(fileUrl: string, mimeType: string): Promise<TranscriptResult>;
}
