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
