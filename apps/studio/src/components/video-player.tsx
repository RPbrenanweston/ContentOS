'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Breadcrumb } from '@/lib/types/domain';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatTimecode(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  const msStr = ms.toString().padStart(3, '0');
  return `${mm}:${ss}.${msStr}`;
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DragTarget = 'none' | 'playhead' | 'trim-in' | 'trim-out';

type ExportState =
  | { status: 'idle' }
  | { status: 'exporting'; progress: number }
  | { status: 'done'; downloadUrl: string; filename: string }
  | { status: 'error'; message: string };

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
  /**
   * Base URL of the media API for clip extraction.
   * Defaults to /api/media/clip (same-origin content-os).
   */
  clipApiUrl?: string;
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
  clipApiUrl = '/api/media/clip',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Trim state
  const [trimIn, setTrimIn] = useState<number>(0);
  const [trimOut, setTrimOut] = useState<number>(0);
  const [trimActive, setTrimActive] = useState(false);

  // Export state
  const [exportState, setExportState] = useState<ExportState>({ status: 'idle' });

  // Drag state in a ref — avoids stale closure issues without extra renders
  const dragTarget = useRef<DragTarget>('none');

  // -------------------------------------------------------------------------
  // Initialise trim points when duration is known
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (duration > 0 && !trimActive) {
      setTrimIn(0);
      setTrimOut(duration);
    }
  }, [duration, trimActive]);

  // -------------------------------------------------------------------------
  // External seek (prop-driven)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (seekTo != null && videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  // -------------------------------------------------------------------------
  // Trim-preview: when playing and we pass the out-point, loop back to in
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!trimActive || !isPlaying) return;

    const video = videoRef.current;
    if (!video) return;

    const check = () => {
      if (video.currentTime >= trimOut) {
        video.currentTime = trimIn;
      }
    };

    video.addEventListener('timeupdate', check);
    return () => video.removeEventListener('timeupdate', check);
  }, [trimActive, isPlaying, trimIn, trimOut]);

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
  // Play / Pause toggle — if trim active, start from in-point
  // -------------------------------------------------------------------------

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (trimActive && (video.currentTime < trimIn || video.currentTime >= trimOut)) {
        video.currentTime = trimIn;
      }
      video.play();
    } else {
      video.pause();
    }
  }, [trimActive, trimIn, trimOut]);

  // -------------------------------------------------------------------------
  // Convert clientX to a time value using the track element bounds
  // -------------------------------------------------------------------------

  const clientXToTime = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track || duration <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pct * duration;
    },
    [duration],
  );

  // -------------------------------------------------------------------------
  // Seek helpers (shared by click and drag)
  // -------------------------------------------------------------------------

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const video = videoRef.current;
      if (!video || duration <= 0) return;
      video.currentTime = clientXToTime(clientX);
    },
    [clientXToTime, duration],
  );

  // -------------------------------------------------------------------------
  // Timeline mouse interactions — determine which handle is being grabbed
  // -------------------------------------------------------------------------

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;

      const time = clientXToTime(e.clientX);

      // Check proximity to trim handles (within 2% of duration)
      const snapRadius = duration * 0.02;

      if (Math.abs(time - trimIn) < snapRadius) {
        dragTarget.current = 'trim-in';
      } else if (Math.abs(time - trimOut) < snapRadius) {
        dragTarget.current = 'trim-out';
      } else {
        dragTarget.current = 'playhead';
        seekFromClientX(e.clientX);
      }
    },
    [clientXToTime, duration, trimIn, trimOut, seekFromClientX],
  );

  // Document-level handlers so dragging works when cursor leaves the track
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const target = dragTarget.current;
      if (target === 'none') return;

      const time = clientXToTime(e.clientX);

      if (target === 'playhead') {
        const video = videoRef.current;
        if (video && duration > 0) video.currentTime = time;
      } else if (target === 'trim-in') {
        const clamped = Math.max(0, Math.min(time, trimOut - 0.1));
        setTrimIn(clamped);
      } else if (target === 'trim-out') {
        const clamped = Math.min(duration, Math.max(time, trimIn + 0.1));
        setTrimOut(clamped);
      }
    };

    const onMouseUp = () => {
      dragTarget.current = 'none';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [clientXToTime, duration, trimIn, trimOut]);

  // -------------------------------------------------------------------------
  // Set In / Set Out from current playback position
  // -------------------------------------------------------------------------

  const handleSetIn = useCallback(() => {
    setTrimIn(Math.min(currentTime, trimOut - 0.1));
    setTrimActive(true);
  }, [currentTime, trimOut]);

  const handleSetOut = useCallback(() => {
    setTrimOut(Math.max(currentTime, trimIn + 0.1));
    setTrimActive(true);
  }, [currentTime, trimIn]);

  const handleResetTrim = useCallback(() => {
    setTrimIn(0);
    setTrimOut(duration);
    setTrimActive(false);
    setExportState({ status: 'idle' });
  }, [duration]);

  // -------------------------------------------------------------------------
  // Export — POST trim points to the clip API
  // -------------------------------------------------------------------------

  const handleExport = useCallback(async () => {
    if (exportState.status === 'exporting') return;
    if (duration <= 0) return;

    setExportState({ status: 'exporting', progress: 0 });

    // Simulate progress while waiting for the server
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let fakeProgress = 0;
    progressInterval = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + 5, 90);
      setExportState({ status: 'exporting', progress: fakeProgress });
    }, 300);

    try {
      const response = await fetch(clipApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: src,
          startMs: Math.round(trimIn * 1000),
          endMs: Math.round(trimOut * 1000),
          format: 'mp4',
        }),
      });

      if (progressInterval) clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Export failed' }));
        setExportState({
          status: 'error',
          message: errData.error ?? `Server error: ${response.status}`,
        });
        return;
      }

      const data = await response.json();
      const downloadUrl: string = data.clipUrl ?? data.url ?? '';
      const filename = downloadUrl.split('/').pop() ?? 'clip.mp4';

      setExportState({ status: 'done', downloadUrl, filename });
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      setExportState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Export failed',
      });
    }
  }, [clipApiUrl, duration, exportState.status, src, trimIn, trimOut]);

  // -------------------------------------------------------------------------
  // Derived layout values
  // -------------------------------------------------------------------------

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trimInPct = duration > 0 ? (trimIn / duration) * 100 : 0;
  const trimOutPct = duration > 0 ? (trimOut / duration) * 100 : 100;

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

        {/* ------------------------------------------------------------------ */}
        {/* Timeline scrubber with trim handles                                  */}
        {/* ------------------------------------------------------------------ */}
        <div
          ref={trackRef}
          className="relative h-10 cursor-pointer select-none"
          onMouseDown={handleTrackMouseDown}
          role="slider"
          aria-label="Video timeline"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
        >
          {/* Track background */}
          <div className="absolute inset-y-[18px] inset-x-0 rounded-full bg-muted/30" />

          {/* Trim region highlight (between in/out handles) */}
          <div
            className="absolute inset-y-[16px] rounded-full bg-accent/25 border border-accent/50"
            style={{
              left: `${trimInPct}%`,
              width: `${trimOutPct - trimInPct}%`,
            }}
          />

          {/* Filled progress (up to playhead) */}
          <div
            className="absolute inset-y-[18px] left-0 rounded-full bg-primary/60"
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

          {/* Trim In handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 cursor-ew-resize group"
            style={{ left: `${trimInPct}%` }}
            title={`In: ${formatTimecode(trimIn)}`}
          >
            {/* Vertical bar */}
            <div className="w-1.5 h-8 rounded-sm bg-emerald-400 border border-emerald-200 shadow group-hover:bg-emerald-300 transition-colors" />
            {/* Small arrow cap */}
            <div className="absolute top-1/2 -translate-y-1/2 left-1.5 w-0 h-0 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-emerald-400" />
          </div>

          {/* Trim Out handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 cursor-ew-resize group"
            style={{ left: `${trimOutPct}%` }}
            title={`Out: ${formatTimecode(trimOut)}`}
          >
            {/* Small arrow cap (pointing left) */}
            <div className="absolute top-1/2 -translate-y-1/2 right-1.5 w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-rose-400" />
            {/* Vertical bar */}
            <div className="w-1.5 h-8 rounded-sm bg-rose-400 border border-rose-200 shadow group-hover:bg-rose-300 transition-colors" />
          </div>

          {/* Draggable playhead handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-text border-2 border-background shadow-md z-20 pointer-events-none"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Timecode display row                                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center justify-between text-xs font-mono text-muted px-1">
          <span className="text-emerald-400" title="Trim in point">
            IN {formatTimecode(trimIn)}
          </span>
          <span className="text-muted/60">
            {formatTimecode(currentTime)} / {formatTimecode(duration)}
          </span>
          <span className="text-rose-400" title="Trim out point">
            OUT {formatTimecode(trimOut)}
          </span>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Control buttons row                                                   */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center w-9 h-9 rounded-md bg-muted/20 hover:bg-muted/40 text-text transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2.5a.5.5 0 0 1 .757-.429l10 5.5a.5.5 0 0 1 0 .858l-10 5.5A.5.5 0 0 1 3 13.5v-11Z" />
              </svg>
            )}
          </button>

          {/* Trim controls */}
          <button
            type="button"
            onClick={handleSetIn}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors"
            title="Mark current position as trim in point"
          >
            Set In
          </button>

          <button
            type="button"
            onClick={handleSetOut}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-colors"
            title="Mark current position as trim out point"
          >
            Set Out
          </button>

          {trimActive && (
            <button
              type="button"
              onClick={handleResetTrim}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-muted/20 hover:bg-muted/40 text-muted transition-colors"
              title="Reset trim points to full duration"
            >
              Reset
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Trim duration badge */}
          {trimActive && (
            <span className="text-xs font-mono text-muted/60 tabular-nums">
              {formatTimecode(trimOut - trimIn)} selected
            </span>
          )}

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={exportState.status === 'exporting' || duration <= 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export trimmed clip"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" />
            </svg>
            Export Clip
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Export progress indicator                                             */}
        {/* ------------------------------------------------------------------ */}
        {exportState.status === 'exporting' && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Processing clip...</span>
              <span>{exportState.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${exportState.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Export done — download link                                           */}
        {/* ------------------------------------------------------------------ */}
        {exportState.status === 'done' && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-emerald-400 shrink-0"
            >
              <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" />
            </svg>
            <span className="text-xs text-emerald-400 flex-1">Clip ready</span>
            <a
              href={exportState.downloadUrl}
              download={exportState.filename}
              className="text-xs font-medium text-emerald-300 underline hover:text-emerald-200"
            >
              Download {exportState.filename}
            </a>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Export error                                                          */}
        {/* ------------------------------------------------------------------ */}
        {exportState.status === 'error' && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-rose-500/10 border border-rose-500/20">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-rose-400 shrink-0"
            >
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
            </svg>
            <span className="text-xs text-rose-400 flex-1">{exportState.status === 'error' ? exportState.message : ''}</span>
            <button
              type="button"
              onClick={() => setExportState({ status: 'idle' })}
              className="text-xs text-rose-300 underline hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
