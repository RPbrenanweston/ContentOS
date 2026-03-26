// @crumb video-viewport
// [UI] | Player viewport | Media container
// why: Container and styling wrapper for video player—handles responsiveness and sizing
// in:[video element, viewport size] out:[viewport DOM, resize listener] err:[resize, layout errors]
// hazard: No ResizeObserver fallback for older browsers—viewport may not adapt properly
// hazard: Hard-coded aspect ratios—non-16:9 videos may display with letterboxing issues
// edge:apps/studio/src/components/console/YouTubePlayer.tsx -> SERVES
// prompt: Add ResizeObserver polyfill, implement dynamic aspect ratio detection from video metadata

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { YouTubePlayer } from './YouTubePlayer';
import type { VideoSourceType } from '@/lib/types/domain';

interface VideoViewportProps {
  sourceType: VideoSourceType;
  fileUrl: string | null;
  sourceUrl: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onReady?: () => void;
  seekTo?: number | null;
}

export function VideoViewport({
  sourceType,
  fileUrl,
  sourceUrl,
  onTimeUpdate,
  onDurationChange,
  onReady,
  seekTo,
}: VideoViewportProps) {
  // YouTube source
  if (sourceType === 'youtube' && sourceUrl) {
    return (
      <YouTubePlayer
        sourceUrl={sourceUrl}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
        onReady={onReady}
        seekTo={seekTo}
      />
    );
  }

  // Upload source
  if (sourceType === 'upload' && fileUrl) {
    return (
      <NativeVideoPlayer
        fileUrl={fileUrl}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
        onReady={onReady}
        seekTo={seekTo}
      />
    );
  }

  // No source
  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <span className="font-mono text-muted text-lg tracking-widest">
        NO SOURCE LOADED
      </span>
    </div>
  );
}

// Native HTML5 video player for uploaded files
function NativeVideoPlayer({
  fileUrl,
  onTimeUpdate,
  onDurationChange,
  onReady,
  seekTo,
}: {
  fileUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onReady?: () => void;
  seekTo?: number | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (seekTo != null && videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      onDurationChange?.(videoRef.current.duration);
      onReady?.();
    }
  }, [onDurationChange, onReady]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black border border-border">
      <video
        ref={videoRef}
        src={fileUrl}
        className="max-w-full max-h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        controls={false}
        playsInline
      />
    </div>
  );
}
