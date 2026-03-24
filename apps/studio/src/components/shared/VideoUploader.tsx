'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isYouTubeUrl } from '@/lib/services/video-source-resolver';

export function VideoUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('INVALID FILE TYPE — VIDEO ONLY');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.error) {
        throw new Error(uploadData.error.message);
      }

      const videoRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'upload',
          fileUrl: uploadData.data.fileUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
        }),
      });
      const videoData = await videoRes.json();

      if (videoData.error) {
        throw new Error(videoData.error.message);
      }

      router.push(`/console/${videoData.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'UPLOAD FAILED');
    } finally {
      setUploading(false);
    }
  }, [router]);

  const handleYouTubeSubmit = useCallback(async () => {
    const url = youtubeUrl.trim();
    if (!url) return;

    if (!isYouTubeUrl(url)) {
      setError('INVALID YOUTUBE URL');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Try backend first
      const videoRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'youtube',
          sourceUrl: url,
          title: `YouTube — ${url.split('v=')[1]?.slice(0, 11) ?? 'video'}`,
        }),
      });
      const videoData = await videoRes.json();

      if (videoData.error) {
        throw new Error(videoData.error.message);
      }

      router.push(`/console/${videoData.data.id}`);
    } catch {
      // Fallback: demo mode — pass YouTube URL directly via query param
      router.push(`/console/demo?youtube=${encodeURIComponent(url)}`);
    } finally {
      setUploading(false);
    }
  }, [youtubeUrl, router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[600px]">
      {/* File drop zone */}
      <div
        className={`
          w-full aspect-video
          border border-dashed
          flex flex-col items-center justify-center gap-4
          cursor-pointer transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <span className="font-mono text-primary text-sm tracking-widest blink">
            LOADING...
          </span>
        ) : (
          <>
            <span className="font-mono text-muted text-sm tracking-widest">
              DROP VIDEO FILE
            </span>
            <span className="font-mono text-muted/50 text-xs">
              OR CLICK TO BROWSE
            </span>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-px bg-border" />
        <span className="font-mono text-xs text-muted">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* YouTube URL input */}
      <div className="w-full flex gap-0">
        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleYouTubeSubmit(); }}
          placeholder="PASTE YOUTUBE URL..."
          className="
            flex-1 px-4 py-3
            bg-surface border border-border border-r-0
            font-mono text-sm text-text
            placeholder:text-muted/50
            focus:outline-none focus:border-primary
          "
          disabled={uploading}
        />
        <button
          onClick={handleYouTubeSubmit}
          disabled={uploading || !youtubeUrl.trim()}
          className="
            px-4 py-3
            bg-primary text-background
            font-heading font-bold text-[13px] uppercase tracking-[0.1em]
            border border-primary
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:bg-primary/90 transition-colors
          "
        >
          [LOAD]
        </button>
      </div>

      {/* Error */}
      {error && (
        <span className="font-mono text-accent text-xs tracking-wider">
          [{error}]
        </span>
      )}
    </div>
  );
}
