import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, MVP_USER_ID } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing or invalid file field' } },
        { status: 400 }
      );
    }

    const uuid = crypto.randomUUID();
    const path = `${MVP_USER_ID}/${uuid}-${file.name}`;
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
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Failed to upload file' } },
      { status: 500 }
    );
  }
}
