'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Breadcrumb } from '@/lib/types/domain';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VideoPlayerProps {
  /** URL of the video file to play */
  src: string;
  /** Breadcrumbs to render as markers on the timeline */
  breadcrumbs?: Breadcrumb[];
  /** Called when playback position changes (seconds) */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when the video duration is known */
  onDurationChange?: (duration: number) => void;
  /** Called when clicking a breadcrumb marker */
  onMarkerClick?: (breadcrumb: Breadcrumb) => void;
  /** External seek target — changing this value seeks to that position */
  seekTo?: number | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VideoPlayer({
  src,
  breadcrumbs = [],
  onTimeUpdate,
  onDurationChange,
  onMarkerClick,
  seekTo,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Drag state lives in a ref so event handlers always have the latest value
  // without causing re-renders on every mousemove.
  const isDragging = useRef(false);

  // -------------------------------------------------------------------------
  // External seek (prop-driven)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (seekTo != null && videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  // -------------------------------------------------------------------------
  // Video event handlers
  // -------------------------------------------------------------------------

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    onTimeUpdate?.(video.currentTime);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    onDurationChange?.(video.duration);
  }, [onDurationChange]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => setIsPlaying(false), []);

  // -------------------------------------------------------------------------
  // Play / Pause toggle
  // -------------------------------------------------------------------------

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  // -------------------------------------------------------------------------
  // Seek helpers (shared by click and drag)
  // -------------------------------------------------------------------------

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      const video = videoRef.current;
      if (!track || !video || duration <= 0) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      video.currentTime = pct * duration;
    },
    [duration]
  );

  // -------------------------------------------------------------------------
  // Timeline mouse interactions
  // -------------------------------------------------------------------------

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore right-clicks
      if (e.button !== 0) return;
      isDragging.current = true;
      seekFromEvent(e.clientX);
    },
    [seekFromEvent]
  );

  // Document-level mousemove / mouseup so dragging works even if cursor leaves
  // the track element.
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      seekFromEvent(e.clientX);
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [seekFromEvent]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col w-full bg-black">
      {/* Video element */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={src}
          className="max-w-full max-h-full object-contain"
          controls={false}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
        />
      </div>

      {/* Custom controls */}
      <div className="flex flex-col gap-2 px-4 py-3 bg-surface border-t border-border">
        {/* Timeline scrubber */}
        <div
          ref={trackRef}
          className="relative h-8 cursor-pointer select-none"
          onMouseDown={handleTrackMouseDown}
          role="slider"
          aria-label="Video timeline"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
        >
          {/* Track background */}
          <div className="absolute inset-y-[14px] inset-x-0 rounded-full bg-muted/30" />

          {/* Filled progress */}
          <div
            className="absolute inset-y-[14px] left-0 rounded-full bg-primary"
            style={{ width: `${progressPct}%` }}
          />

          {/* Breadcrumb markers */}
          {duration > 0 &&
            breadcrumbs.map((bc) => {
              const markerPct = (bc.timestampSeconds / duration) * 100;
              return (
                <button
                  key={bc.id}
                  type="button"
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent border-2 border-background z-10 hover:scale-125 transition-transform"
                  style={{ left: `calc(${markerPct}% - 6px)` }}
                  title={bc.note ?? `Breadcrumb at ${formatTime(bc.timestampSeconds)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkerClick?.(bc);
                    if (videoRef.current) {
                      videoRef.current.currentTime = bc.timestampSeconds;
                    }
                  }}
                />
              );
            })}

          {/* Draggable playhead handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-text border-2 border-background shadow-md z-20 pointer-events-none"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* Bottom controls row */}
        <div className="flex items-center gap-4">
          {/* Play / Pause button */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-muted/20 hover:bg-muted/40 text-text transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              /* Pause icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              /* Play icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2.5a.5.5 0 0 1 .757-.429l10 5.5a.5.5 0 0 1 0 .858l-10 5.5A.5.5 0 0 1 3 13.5v-11Z" />
              </svg>
            )}
          </button>

          {/* Time display */}
          <span className="font-mono text-sm text-muted tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
