// @crumb media-clip-extraction
// API | media-processing | clip-generator
// why: Extract time-bounded video clips via FFmpeg; validates start/end timestamps, processes source media, returns clipped output with format conversion
// in:[{sourceUrl,startMs,endMs,format}] out:[{clipUrl,duration,format,filesize}] err:[validation-failed, invalid-range, extract-failed]
// hazard: sourceUrl accepts any URL without validation; could trigger SSRF attacks to internal services or provide access to authenticated URLs user shouldn't reach
// hazard: startMs/endMs validation only checks endMs > startMs, not against actual video duration; requesting clips beyond media length could hang FFmpeg or consume resources
// hazard: No timeout on mediaService.extractClip(); long videos with large clip ranges could block indefinitely, exhausting worker threads
// hazard: FFmpegMediaService instantiated per request (new FFmpegMediaService()) without connection pooling; no resource reuse across concurrent requests
// hazard: Error response exposes FFmpeg errors directly; could leak file paths, server configuration, or internal service details
// edge:../../services/media.service.ts -> USES
// edge:../upload/route.ts -> CONSUMES (uses uploaded source URLs)
// edge:../../lib/validation.ts -> REFERENCES
// prompt: Validate sourceUrl against whitelist/allowlist of supported domains; enforce timeout on clip extraction; implement FFmpegMediaService connection pooling; add auth checks for URL ownership; add rate limiting by userId; sanitize error responses
//
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { clipExtractionSchema } from '@/lib/validation';
import { validateExternalUrl } from '@/lib/url-validation';
import { FFmpegMediaService } from '@/services/media.service';

// POST /api/media/clip — Extract a video clip via FFmpeg
export const POST = withApiHandler<z.infer<typeof clipExtractionSchema>>(async (ctx) => {
  const { body } = ctx;

  if (body.endMs <= body.startMs) {
    return NextResponse.json(
      { error: 'endMs must be greater than startMs' },
      { status: 400 },
    );
  }

  const urlCheck = validateExternalUrl(body.sourceUrl);
  if (!urlCheck.valid) {
    return NextResponse.json(
      { error: `Invalid source URL: ${urlCheck.reason}` },
      { status: 400 },
    );
  }

  const mediaService = new FFmpegMediaService();
  const result = await mediaService.extractClip({
    sourceUrl: body.sourceUrl,
    startMs: body.startMs,
    endMs: body.endMs,
    format: body.format,
  });

  return NextResponse.json(result, { status: 201 });
}, { schema: clipExtractionSchema });
