// @crumb media-upload-handler
// API | file-storage | upload-endpoint
// why: Accept multipart file uploads (video, audio, image) to Supabase Storage; validates MIME type and size constraints before persistence, returns signed public URL
// in:[FormData:file] out:[{url,path,size,contentType,filename}] err:[no-file, unsupported-type, size-exceeded, upload-failed]
// hazard: File extension extracted from name (split('.')​.pop()) is user-controlled and untrusted; malicious .exe or .zip masquerading as .mp4 could bypass MIME check if extension used downstream
// hazard: No auth check; any client can upload files and exhaust storage quota without ownership verification or rate limiting
// hazard: Supabase storage bucket name hardcoded ('content-os'); no isolation for multi-tenant deployments or environments
// hazard: getPublicUrl returns unconditional public access; no expiration or signed URL generation for sensitive media
// edge:../../infrastructure/supabase/client.ts -> USES
// edge:../clip/route.ts -> CONSUMES (uses uploaded path)
// prompt: Add cryptographic path generation (uuid or blake3); implement auth checks with ownership tracking; add rate limiting by userId; use signed URLs with expiration for sensitive media; validate FormData schema; configure storage bucket RLS policies
//
import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { createServiceClient } from '@/infrastructure/supabase/client';

// POST /api/media/upload — Upload file to Supabase Storage
export const POST = withApiHandler(async (ctx) => {
  const { request } = ctx;
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
  const path = `uploads/${timestamp}-${crypto.randomUUID()}.${ext}`;

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
});
