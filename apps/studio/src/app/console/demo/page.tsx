'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ConsoleLayout } from '@/components/console/ConsoleLayout';
import { VideoViewport } from '@/components/console/VideoViewport';
import { MasterTimecode } from '@/components/console/MasterTimecode';
import { CaptureButton } from '@/components/console/CaptureButton';
import { WaveformTimeline } from '@/components/console/WaveformTimeline';
import { useKeyboardCapture } from '@/lib/hooks/useKeyboardCapture';
import { useDemoState } from '@/lib/hooks/useDemoState';

export default function DemoConsoleWrapper() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <span className="font-mono text-muted text-sm tracking-widest blink">LOADING...</span>
      </div>
    }>
      <DemoConsolePage />
    </Suspense>
  );
}

function DemoConsolePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const youtubeUrl = searchParams.get('youtube');

  const {
    youtubeUrl: storedUrl,
    breadcrumbs,
    duration,
    setDuration,
    createBreadcrumb,
  } = useDemoState(youtubeUrl);

  const activeUrl = youtubeUrl || storedUrl;
  const sourceType = activeUrl ? 'youtube' as const : 'upload' as const;

  const [currentTime, setCurrentTime] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  const handleCapture = useCallback(() => {
    if (currentTime >= 0) {
      createBreadcrumb(currentTime);
    }
  }, [currentTime, createBreadcrumb]);

  const handleSeek = useCallback((seconds: number) => {
    setSeekTarget(seconds);
    setCurrentTime(seconds);
    setTimeout(() => setSeekTarget(null), 50);
  }, []);

  const handleMarkerClick = useCallback((bc: { timestampSeconds: number }) => {
    handleSeek(bc.timestampSeconds);
  }, [handleSeek]);

  useKeyboardCapture({
    onMark: handleCapture,
    enabled: true,
  });

  const markerCount = breadcrumbs.length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Nav with Logbook link active in demo mode */}
      <nav className="flex items-center gap-0 border-b border-border bg-background">
        <div className="px-4 py-2 border-r border-border">
          <span className="font-heading font-bold text-xs text-primary tracking-[0.2em]">
            BREADCRUMB
          </span>
        </div>
        <button
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-primary bg-surface"
        >
          CONSOLE
        </button>
        <button
          onClick={() => router.push('/logbook/demo')}
          disabled={markerCount === 0}
          className={`
            px-4 py-2 border-r border-border
            font-heading font-semibold text-[13px] uppercase tracking-[0.1em]
            transition-colors
            ${markerCount > 0 ? 'text-muted hover:text-text cursor-pointer' : 'text-muted/30 cursor-not-allowed'}
          `}
        >
          LOGBOOK {markerCount > 0 && `(${markerCount})`}
        </button>
        <button
          onClick={() => router.push('/assembly/demo')}
          disabled={markerCount === 0}
          className={`
            px-4 py-2 border-r border-border
            font-heading font-semibold text-[13px] uppercase tracking-[0.1em]
            transition-colors
            ${markerCount > 0 ? 'text-muted hover:text-text cursor-pointer' : 'text-muted/30 cursor-not-allowed'}
          `}
        >
          ASSEMBLY
        </button>
        <button
          onClick={() => router.push('/archive')}
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-muted hover:text-text transition-colors"
        >
          ARCHIVE
        </button>
      </nav>

      <div className="flex-1 min-h-0">
        <ConsoleLayout
          viewport={
            <div className="relative w-full h-full">
              <VideoViewport
                sourceType={sourceType}
                fileUrl={null}
                sourceUrl={activeUrl}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                seekTo={seekTarget}
              />
              <MasterTimecode currentSeconds={currentTime} />

              <div className="absolute top-4 left-4 z-10">
                <span className="font-mono text-[10px] text-muted bg-surface px-2 py-1 border border-border">
                  DEMO MODE — {markerCount} MARKER{markerCount !== 1 ? 'S' : ''}
                </span>
              </div>
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
            <CaptureButton onCapture={handleCapture} />
          }
        />
      </div>
    </div>
  );
}
