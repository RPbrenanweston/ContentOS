/**
 * Media processing service using fluent-ffmpeg.
 *
 * Handles video clip extraction, format conversion, and thumbnail generation.
 * Outputs are uploaded to Supabase Storage.
 */

import ffmpeg from 'fluent-ffmpeg';
import { createServiceClient } from '@/infrastructure/supabase/client';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { IMediaService, ClipParams, ClipResult } from './interfaces/media.service';

export class FFmpegMediaService implements IMediaService {
  async extractClip(params: ClipParams): Promise<ClipResult> {
    const { sourceUrl, startMs, endMs, format = 'mp4' } = params;
    const durationMs = endMs - startMs;
    const startSec = startMs / 1000;
    const durationSec = durationMs / 1000;

    // Create temp output file
    const outputPath = join(
      tmpdir(),
      `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${format}`,
    );

    await new Promise<void>((resolve, reject) => {
      let cmd = ffmpeg(sourceUrl)
        .setStartTime(startSec)
        .setDuration(durationSec)
        .output(outputPath)
        .outputOptions([
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-preset', 'fast',
          '-movflags', '+faststart',
        ]);

      if (params.maxSizeMb) {
        // Target bitrate to fit size constraint
        const targetBitrateKbps = Math.floor(
          (params.maxSizeMb * 8 * 1024) / durationSec,
        );
        cmd = cmd.videoBitrate(`${targetBitrateKbps}k`);
      }

      cmd
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`FFmpeg clip extraction failed: ${err.message}`)))
        .run();
    });

    // Read the file and upload to storage
    const buffer = await fs.readFile(outputPath);
    const stat = await fs.stat(outputPath);
    const sizeMb = stat.size / (1024 * 1024);

    const supabase = createServiceClient();
    const storagePath = `clips/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${format}`;

    const { error } = await supabase.storage
      .from('content-os')
      .upload(storagePath, buffer, {
        contentType: format === 'mp4' ? 'video/mp4' : 'video/webm',
        upsert: false,
      });

    // Clean up temp file
    await fs.unlink(outputPath).catch(() => {});

    if (error) {
      throw new Error(`Failed to upload clip: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('content-os')
      .getPublicUrl(storagePath);

    return {
      url: urlData.publicUrl,
      durationMs,
      sizeMb: Math.round(sizeMb * 100) / 100,
    };
  }

  async generateThumbnail(
    videoUrl: string,
    timestampMs: number,
  ): Promise<string> {
    const outputPath = join(
      tmpdir(),
      `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`,
    );

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoUrl)
        .screenshots({
          timestamps: [timestampMs / 1000],
          filename: outputPath.split('/').pop()!,
          folder: tmpdir(),
          size: '640x360',
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)));
    });

    // Upload thumbnail
    const buffer = await fs.readFile(outputPath);
    const supabase = createServiceClient();
    const storagePath = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const { error } = await supabase.storage
      .from('content-os')
      .upload(storagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    await fs.unlink(outputPath).catch(() => {});

    if (error) {
      throw new Error(`Failed to upload thumbnail: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('content-os')
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  }
}
