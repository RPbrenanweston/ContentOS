// @crumb waveform-timeline
// [UI] | Audio waveform display | Timeline scrubber
// why: Renders audio waveform visualization and timeline scrubber for video editing
// in:[audio data, current time, markers] out:[canvas waveform, scrubber handle] err:[render, audio errors]
// hazard: Canvas rendering not optimized—large videos (1+ hour) may cause jank on low-end devices
// hazard: Waveform cache not invalidated on video swap—old waveform may display briefly
// edge:apps/studio/src/components/console/MasterTimecode.tsx -> RELATES
// prompt: Implement waveform caching with video ID key, add off-screen rendering for large files

'use client';

import { useCallback, useRef } from 'react';
import { TimelineMarker } from './TimelineMarker';
import type { Breadcrumb } from '@/lib/types/domain';

interface WaveformTimelineProps {
  durationSeconds: number;
  currentTime: number;
  breadcrumbs: Breadcrumb[];
  onSeek: (seconds: number) => void;
  onMarkerClick?: (breadcrumb: Breadcrumb) => void;
}

export function WaveformTimeline({
  durationSeconds,
  currentTime,
  breadcrumbs,
  onSeek,
  onMarkerClick,
}: WaveformTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current || durationSeconds <= 0) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      const seconds = pct * durationSeconds;
      onSeek(Math.max(0, Math.min(durationSeconds, seconds)));
    },
    [durationSeconds, onSeek]
  );

  const playheadPct = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Track area */}
      <div
        ref={trackRef}
        className="relative flex-1 cursor-crosshair"
        onClick={handleTrackClick}
      >
        {/* Simulated waveform bars (visual placeholder) */}
        <div className="absolute inset-0 flex items-end px-0.5 gap-px overflow-hidden">
          {Array.from({ length: 200 }).map((_, i) => {
            const height = 20 + Math.sin(i * 0.3) * 15 + Math.cos(i * 0.7) * 10 + Math.random() * 5;
            return (
              <div
                key={i}
                className="flex-1 min-w-[1px] bg-muted/40"
                style={{ height: `${Math.max(5, height)}%` }}
              />
            );
          })}
        </div>

        {/* Breadcrumb markers */}
        {breadcrumbs.map((bc) => (
          <TimelineMarker
            key={bc.id}
            breadcrumb={bc}
            durationSeconds={durationSeconds}
            onClick={onMarkerClick}
          />
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-text/70 pointer-events-none z-10"
          style={{ left: `${playheadPct}%` }}
        />
      </div>
    </div>
  );
}
