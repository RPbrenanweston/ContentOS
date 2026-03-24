import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/client';

// POST /api/media/upload — Upload file to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = [
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 },
      );
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File exceeds 500MB limit' },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const ext = file.name.split('.').pop() ?? 'bin';
    const timestamp = Date.now();
    const path = `uploads/${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from('content-os')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 },
      );
    }

    const { data: urlData } = supabase.storage
      .from('content-os')
      .getPublicUrl(path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path,
      size: file.size,
      contentType: file.type,
      filename: file.name,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/media/upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 },
    );
  }
}
