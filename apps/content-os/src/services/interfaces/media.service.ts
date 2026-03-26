/**
 * @crumb
 * id: media-transformation-interface
 * AREA: DOM
 * why: Define contract for video clip extraction and thumbnail generation—timestamp precision and format flexibility
 * in: ClipParams {sourceUrl, startMs, endMs, format, maxSizeMb}; ThumbnailParams implicit {videoUrl, timestampMs}
 * out: ClipResult {url, durationMs, sizeMb}; ThumbnailUrl (string)
 * err: No errors typed—implementation must handle FFmpeg unavailability and malformed timing
 * hazard: ClipParams lacks validation constraints—startMs >= endMs accepted without runtime guards, causing FFmpeg hangs
 * hazard: extractClip() permits arbitrary maxSizeMb values—bitrate calculation could overflow or produce invalid codec parameters
 * edge: IMPLEMENTED_BY media.service.ts (concrete implementation)
 * edge: SERVES distribution.service.ts (provides mediaUrls for publishing payloads)
 * edge: CALLED_BY transcript.service.ts output (receives timestamp boundaries for clip extraction)
 * edge: WRITES Supabase Storage (clips/ and thumbnails/ buckets)
 * prompt: Test timing invariants (startMs < endMs, no negative values, boundary cases); verify maxSizeMb=1 bitrate calculation; validate format parameter acceptance
 */

export interface ClipParams {
  sourceUrl: string;
  startMs: number;
  endMs: number;
  format?: 'mp4' | 'webm';
  maxSizeMb?: number;
}

export interface ClipResult {
  url: string;
  durationMs: number;
  sizeMb: number;
}

export interface IMediaService {
  extractClip(params: ClipParams): Promise<ClipResult>;
  generateThumbnail(videoUrl: string, timestampMs: number): Promise<string>;
}
