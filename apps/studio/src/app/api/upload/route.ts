// @crumb upload-handler
// API | file persistence | storage delegation
// why: Handle multipart file uploads to Supabase storage with path isolation per user
// in:[POST FormData with file field] out:[fileUrl and path] err:[VALIDATION_ERROR, UPLOAD_ERROR, INTERNAL_ERROR]
// hazard: No file size limit checked before upload—unlimited files can exhaust storage quota
// hazard: filename used directly in path without sanitization—special characters can create path traversal or encoding issues
// hazard: No content-type validation—binary or executable files can be uploaded if mime-type claim is false
// edge:../videos/route.ts -> SERVES (upload endpoint stores video files referenced by file_url)
// prompt: Add file size ceiling; sanitize filename; validate content against claimed mime-type signature

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler } from '@/lib/api-handler';

export const POST = withApiHandler(async (ctx) => {
  const formData = await ctx.request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing or invalid file field' } },
      { status: 400 }
    );
  }

  const uuid = crypto.randomUUID();
  const path = `${ctx.userId}/${uuid}-${file.name}`;
  const supabase = createServerClient();

  const { error } = await supabase.storage
    .from('studio-videos')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      { data: null, error: { code: 'UPLOAD_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from('studio-videos')
    .getPublicUrl(path);

  return NextResponse.json({
    data: {
      fileUrl: urlData.publicUrl,
      path,
    },
  });
});
