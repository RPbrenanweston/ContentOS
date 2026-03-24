'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { formatCompact } from '@/lib/utils/time';

interface ClipTrimmerProps {
  durationSeconds: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

export function ClipTrimmer({
  durationSeconds,
  startTime,
  endTime,
  currentTime,
  onTrimChange,
  onSeek,
}: ClipTrimmerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | 'playhead' | null>(null);

  const pct = (seconds: number) => durationSeconds > 0 ? (seconds / durationSeconds) * 100 : 0;

  const secondsFromX = useCallback((clientX: number) => {
    if (!trackRef.current || durationSeconds <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * durationSeconds;
  }, [durationSeconds]);

  const handleMouseDown = useCallback((type: 'start' | 'end' | 'playhead') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const seconds = secondsFromX(e.clientX);
      if (dragging === 'start') {
        onTrimChange(Math.min(seconds, endTime - 0.5), endTime);
      } else if (dragging === 'end') {
        onTrimChange(startTime, Math.max(seconds, startTime + 0.5));
      } else if (dragging === 'playhead') {
        onSeek(seconds);
      }
    };

    const handleUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, startTime, endTime, secondsFromX, onTrimChange, onSeek]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const seconds = secondsFromX(e.clientX);
    onSeek(seconds);
  }, [secondsFromX, onSeek]);

  const trimDuration = endTime - startTime;

  return (
    <div className="space-y-2">
      {/* Time display */}
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-primary tabular-nums">{formatCompact(startTime)}</span>
        <span className="text-muted">
          CLIP: {trimDuration.toFixed(1)}s
        </span>
        <span className="text-primary tabular-nums">{formatCompact(endTime)}</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-10 bg-background border border-border cursor-pointer select-none"
        onClick={handleTrackClick}
      >
        {/* Inactive regions (dimmed) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-background/70 z-[1]"
          style={{ width: `${pct(startTime)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-background/70 z-[1]"
          style={{ width: `${100 - pct(endTime)}%` }}
        />

        {/* Active region */}
        <div
          className="absolute top-0 bottom-0 bg-surface/50 border-y border-primary/30 z-[2]"
          style={{ left: `${pct(startTime)}%`, width: `${pct(endTime) - pct(startTime)}%` }}
        />

        {/* Start handle */}
        <div
          className="absolute top-0 bottom-0 w-[6px] bg-primary cursor-col-resize z-[5] hover:bg-primary/80"
          style={{ left: `${pct(startTime)}%`, transform: 'translateX(-3px)' }}
          onMouseDown={handleMouseDown('start')}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-4 bg-background" />
        </div>

        {/* End handle */}
        <div
          className="absolute top-0 bottom-0 w-[6px] bg-primary cursor-col-resize z-[5] hover:bg-primary/80"
          style={{ left: `${pct(endTime)}%`, transform: 'translateX(-3px)' }}
          onMouseDown={handleMouseDown('end')}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-4 bg-background" />
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-text z-[4] cursor-col-resize"
          style={{ left: `${pct(currentTime)}%` }}
          onMouseDown={handleMouseDown('playhead')}
        />
      </div>
    </div>
  );
}
