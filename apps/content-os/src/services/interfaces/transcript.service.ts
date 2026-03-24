/**
 * @crumb
 * id: transcript-result-interface
 * AREA: DAT
 * why: Define contract for word-level transcription—segments enable precise clip extraction and segment-level analysis
 * in: fileUrl (string), mimeType (string)
 * out: TranscriptResult {fullText, segments[], language, durationMs}
 * err: No errors typed—implementation must handle Deepgram API failures and malformed responses
 * hazard: TranscriptSegment lacks confidence aggregation rules—segments without word-level confidence default to 0 causing false precision
 * hazard: durationMs derivation (metadata vs. last segment end) has precedence ambiguity—implementations could return inconsistent duration values
 * edge: IMPLEMENTED_BY transcript.service.ts (concrete implementation)
 * edge: SERVES media.service.ts (segment startMs/endMs drive clip boundary extraction)
 * edge: SERVES decomposition.service.ts (fullText provides input for content analysis)
 * edge: CALLED_BY distribution pipeline (provides transcript input for asset generation)
 * prompt: Test segment ordering invariants (no out-of-order segments); verify durationMs exceeds last segment endMs; validate confidence range [0,1]
 */

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
