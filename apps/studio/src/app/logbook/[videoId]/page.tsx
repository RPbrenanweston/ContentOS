// @crumb logbook-detail-page
// [UI] | Annotation ledger | Editor workspace
// why: Logbook view for video annotations, markers, clips, and text overlays
// in:[videoId, markers, annotations, clips] out:[ledger UI, marker list, clip timeline] err:[auth, data fetch, render errors]
// hazard: Marker list may contain stale references if clips are deleted without cascade update
// hazard: No pagination on large marker lists—could cause performance degradation with 1000+ markers
// edge:apps/studio/src/components/logbook/LogbookLayout.tsx -> SERVES
// prompt: Implement marker pagination, add cascade delete handler, validate marker references on load

'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { NavBar } from '@/components/shared/NavBar';
import { LogbookLayout } from '@/components/logbook/LogbookLayout';
import { VideoViewport } from '@/components/console/VideoViewport';
import { MasterTimecode } from '@/components/console/MasterTimecode';
import { WaveformTimeline } from '@/components/console/WaveformTimeline';
import { LedgerPanel } from '@/components/logbook/LedgerPanel';
import { useVideo } from '@/lib/hooks/useVideo';
import { useBreadcrumbs } from '@/lib/hooks/useBreadcrumbs';
import type { Breadcrumb } from '@/lib/types/domain';

export default function LogbookPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  const { video } = useVideo(videoId);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [activeBreadcrumbId, setActiveBreadcrumbId] = useState<string | null>(null);

  const { breadcrumbs, updateBreadcrumb, deleteBreadcrumb } = useBreadcrumbs(videoId, duration);

  const handleSeek = useCallback((seconds: number) => {
    setSeekTarget(seconds);
    setCurrentTime(seconds);
    setTimeout(() => setSeekTarget(null), 50);
  }, []);

  const handleSelectBreadcrumb = useCallback((bc: Breadcrumb) => {
    setActiveBreadcrumbId(bc.id);
    handleSeek(bc.startTimeSeconds);
  }, [handleSeek]);

  const handleMarkerClick = useCallback((bc: Breadcrumb) => {
    handleSelectBreadcrumb(bc);
  }, [handleSelectBreadcrumb]);

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
        <LogbookLayout
          videoSection={
            <div className="flex flex-col h-full">
              {/* Video viewport — takes remaining space */}
              <div className="relative flex-1 min-h-0">
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

              {/* Mini timeline */}
              <div className="h-[80px] border-t border-border bg-surface">
                <WaveformTimeline
                  durationSeconds={duration ?? 0}
                  currentTime={currentTime}
                  breadcrumbs={breadcrumbs}
                  onSeek={handleSeek}
                  onMarkerClick={handleMarkerClick}
                />
              </div>
            </div>
          }
          ledgerPanel={
            <LedgerPanel
              breadcrumbs={breadcrumbs}
              activeBreadcrumbId={activeBreadcrumbId}
              onSelect={handleSelectBreadcrumb}
              onUpdate={updateBreadcrumb}
              onDelete={deleteBreadcrumb}
            />
          }
        />
      </div>
    </div>
  );
}
