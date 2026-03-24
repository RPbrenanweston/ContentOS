// @crumb console-video-detail
// [UI] | Video editor workspace | Primary studio view
// why: Main editor page for single video—integrates player, waveform, markers, timeline
// in:[videoId param, user session, video metadata] out:[rendered editor UI, waveform/markers] err:[auth, video fetch, render errors]
// hazard: videoId parameter not validated—may expose unowned videos if permission checks fail
// hazard: Heavy component tree may cause performance issues with large videos or sluggish networks
// edge:apps/studio/src/components/console/ConsoleLayout.tsx -> SERVES
// prompt: Add URL param validation, implement permission check for video ownership, consider code splitting

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { NavBar } from '@/components/shared/NavBar';
import { ConsoleLayout } from '@/components/console/ConsoleLayout';
import { VideoViewport } from '@/components/console/VideoViewport';
import { MasterTimecode } from '@/components/console/MasterTimecode';
import { CaptureButton } from '@/components/console/CaptureButton';
import { WaveformTimeline } from '@/components/console/WaveformTimeline';
import { useBreadcrumbs } from '@/lib/hooks/useBreadcrumbs';
import { useKeyboardCapture } from '@/lib/hooks/useKeyboardCapture';
import type { Video } from '@/lib/types/domain';

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((d) => d.data);

export default function ConsoleVideoPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  // Fetch video data
  const { data: video } = useSWR<Video>(`/api/videos/${videoId}`, fetcher);

  // Player state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  // Breadcrumbs
  const { breadcrumbs, createBreadcrumb } = useBreadcrumbs(videoId, duration);

  // Update video duration in DB when we first learn it
  useEffect(() => {
    if (duration && video && video.durationSeconds == null) {
      fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSeconds: duration }),
      });
    }
  }, [duration, video, videoId]);

  // Capture handler — drops a breadcrumb at current playback time
  const handleCapture = useCallback(() => {
    if (currentTime >= 0) {
      createBreadcrumb(currentTime);
    }
  }, [currentTime, createBreadcrumb]);

  // Play/pause toggle
  const handleTogglePlay = useCallback(() => {
    const el = document.querySelector('video');
    if (el) {
      if (el.paused) el.play();
      else el.pause();
    }
  }, []);

  // Keyboard capture: Space = mark
  useKeyboardCapture({
    onMark: handleCapture,
    onTogglePlay: handleTogglePlay,
    enabled: !!video,
  });

  // Seek when clicking timeline
  const handleSeek = useCallback((seconds: number) => {
    setSeekTarget(seconds);
    setCurrentTime(seconds);
    // Clear seek target after a tick
    setTimeout(() => setSeekTarget(null), 50);
  }, []);

  // Click marker to seek
  const handleMarkerClick = useCallback((bc: { timestampSeconds: number }) => {
    handleSeek(bc.timestampSeconds);
  }, [handleSeek]);

  if (!video) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <NavBar videoId={videoId} />
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-muted text-sm tracking-widest blink">
            LOADING...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <NavBar videoId={videoId} />
      <div className="flex-1 min-h-0">
        <ConsoleLayout
          viewport={
            <div className="relative w-full h-full">
              <VideoViewport
                sourceType={video.sourceType}
                fileUrl={video.fileUrl}
                sourceUrl={video.sourceUrl}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                seekTo={seekTarget}
              />
              <MasterTimecode currentSeconds={currentTime} />
            </div>
          }
          timeline={
            <WaveformTimeline
              durationSeconds={duration ?? 0}
              currentTime={currentTime}
              breadcrumbs={breadcrumbs}
              onSeek={handleSeek}
              onMarkerClick={handleMarkerClick}
            />
          }
          captureButton={
            <CaptureButton
              onCapture={handleCapture}
              disabled={!video.fileUrl && !video.sourceUrl}
            />
          }
        />
      </div>
    </div>
  );
}
