// @crumb media-clip-extraction
// API | media-processing | clip-generator
// why: Extract time-bounded video clips via FFmpeg; validates start/end timestamps, processes source media, returns clipped output with format conversion
// in:[{sourceUrl,startMs,endMs,format}] out:[{clipUrl,duration,format,filesize}] err:[validation-failed, invalid-range, extract-failed]
// hazard: sourceUrl accepts any URL without validation; could trigger SSRF attacks to internal services or provide access to authenticated URLs user shouldn't reach
// hazard: startMs/endMs validation only checks endMs > startMs, not against actual video duration; requesting clips beyond media length could hang FFmpeg or consume resources
// hazard: No timeout on mediaService.extractClip(); long videos with large clip ranges could block indefinitely, exhausting worker threads
// hazard: FFmpegMediaService instantiated per request (new FFmpegMediaService()) without connection pooling; no resource reuse across concurrent requests
// hazard: No auth check; any client can extract clips from any URL without ownership verification or rate limiting
// hazard: Error response exposes FFmpeg errors directly; could leak file paths, server configuration, or internal service details
// edge:../../services/media.service.ts -> USES
// edge:../upload/route.ts -> CONSUMES (uses uploaded source URLs)
// edge:../../lib/validation.ts -> REFERENCES
// prompt: Validate sourceUrl against whitelist/allowlist of supported domains; enforce timeout on clip extraction; implement FFmpegMediaService connection pooling; add auth checks for URL ownership; add rate limiting by userId; sanitize error responses
//
import { NextRequest, NextResponse } from 'next/server';
import { clipExtractionSchema } from '@/lib/validation';
import { FFmpegMediaService } from '@/services/media.service';

// POST /api/media/clip — Extract a video clip via FFmpeg
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = clipExtractionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.endMs <= parsed.data.startMs) {
      return NextResponse.json(
        { error: 'endMs must be greater than startMs' },
        { status: 400 },
      );
    }

    const mediaService = new FFmpegMediaService();
    const result = await mediaService.extractClip({
      sourceUrl: parsed.data.sourceUrl,
      startMs: parsed.data.startMs,
      endMs: parsed.data.endMs,
      format: parsed.data.format,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/media/clip error:', error);
    return NextResponse.json(
      { error: 'Clip extraction failed' },
      { status: 500 },
    );
  }
}
