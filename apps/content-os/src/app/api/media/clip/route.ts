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
