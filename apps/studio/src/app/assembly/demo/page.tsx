// @crumb assembly-demo-page
// [UI] | Demo compositor | Tutorial assembly
// why: Demo mode for assembly—shows sample clips and render workflow
// in:[demo clips, demo video] out:[demo assembly UI, disabled export] err:[state errors]
// hazard: Demo render preview may not match actual renderer output quality
// hazard: Hard-coded demo clips—no way to update demo if assembly workflow changes
// edge:apps/studio/src/app/assembly/[videoId]/page.tsx -> RELATES
// prompt: Refactor demo state to use factory function, add renderer preview accuracy note

// @crumb assembly-demo-page
// [UI] | Demo compositor | Tutorial assembly
// why: Demo mode for assembly—shows sample clips and render workflow
// in:[demo clips, demo video] out:[demo assembly UI, disabled export] err:[state errors]
// hazard: Demo render preview may not match actual renderer output quality
// hazard: Hard-coded demo clips—no way to update demo if assembly workflow changes
// edge:apps/studio/src/app/assembly/\[videoId\]/page.tsx -> RELATES
// prompt: Refactor demo state to use factory function, add renderer preview accuracy note

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AssemblyLayout } from '@/components/assembly/AssemblyLayout';
import { ClipSelector } from '@/components/assembly/ClipSelector';
import { ExportSettings } from '@/components/assembly/ExportSettings';
import { RenderButton } from '@/components/assembly/RenderButton';
import { useDemoState } from '@/lib/hooks/useDemoState';
import { formatCompact } from '@/lib/utils/time';
import { PLATFORM_PRESETS, ALL_PRESETS } from '@/lib/types/platforms';

export const dynamic = 'force-dynamic';

interface RenderedClip {
  breadcrumbId: string;
  label: string;
  platforms: string[];
  url: string | null;
  status: 'ready' | 'no-recording';
  note: string | null;
}

export default function DemoAssemblyPage() {
  const router = useRouter();
  const { youtubeUrl, breadcrumbs, hasRecording, getRecording } = useDemoState();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(PLATFORM_PRESETS.map((p) => p.id))
  );
  const [renderedClips, setRenderedClips] = useState<RenderedClip[]>([]);
  const [rendered, setRendered] = useState(false);

  const handleTogglePlatform = useCallback((id: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllShortForm = useCallback(() => {
    setSelectedPlatforms((prev) => {
      const allSelected = PLATFORM_PRESETS.every((p) => prev.has(p.id));
      const next = new Set(prev);
      PLATFORM_PRESETS.forEach((p) => {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  }, []);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === breadcrumbs.length) return new Set();
      return new Set(breadcrumbs.map((b) => b.id));
    });
  }, [breadcrumbs]);

  const handleRender = useCallback(() => {
    const selected = breadcrumbs.filter((b) => selectedIds.has(b.id));
    const platformNames = Array.from(selectedPlatforms)
      .map((id) => ALL_PRESETS.find((p) => p.id === id)?.icon)
      .filter(Boolean) as string[];

    const clips: RenderedClip[] = selected.map((bc) => {
      const recording = getRecording(bc.id);
      return {
        breadcrumbId: bc.id,
        label: `CLIP ${formatCompact(bc.startTimeSeconds)} — ${formatCompact(bc.endTimeSeconds)}`,
        platforms: platformNames,
        url: recording?.url ?? null,
        status: recording ? 'ready' : 'no-recording',
        note: bc.note,
      };
    });

    setRenderedClips(clips);
    setRendered(true);
  }, [selectedIds, selectedPlatforms, breadcrumbs, getRecording]);

  if (!youtubeUrl) {
    if (typeof window !== 'undefined') router.push('/console');
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <span className="font-mono text-muted text-sm tracking-widest blink">REDIRECTING...</span>
      </div>
    );
  }

  // Count clips with recordings
  const selectedBreadcrumbs = breadcrumbs.filter((b) => selectedIds.has(b.id));
  const withRecordings = selectedBreadcrumbs.filter((b) => hasRecording(b.id)).length;
  const withoutRecordings = selectedBreadcrumbs.length - withRecordings;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center gap-0 border-b border-border bg-background">
        <div className="px-4 py-2 border-r border-border">
          <span className="font-heading font-bold text-xs text-primary tracking-[0.2em]">
            BREADCRUMB
          </span>
        </div>
        <button
          onClick={() => router.push(`/console/demo?youtube=${encodeURIComponent(youtubeUrl)}`)}
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-muted hover:text-text transition-colors"
        >
          CONSOLE
        </button>
        <button
          onClick={() => router.push('/logbook/demo')}
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-muted hover:text-text transition-colors"
        >
          LOGBOOK
        </button>
        <button
          className="px-4 py-2 border-r border-border font-heading font-semibold text-[13px] uppercase tracking-[0.1em] text-primary bg-surface"
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
        <AssemblyLayout
          clipSelector={
            <ClipSelector
              breadcrumbs={breadcrumbs}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
            />
          }
          exportSettings={
            <ExportSettings
              selectedCount={selectedIds.size}
              selectedPlatforms={selectedPlatforms}
              onTogglePlatform={handleTogglePlatform}
              onSelectAllShortForm={handleSelectAllShortForm}
              clipDurations={selectedBreadcrumbs.map((b) => b.endTimeSeconds - b.startTimeSeconds)}
            />
          }
          renderQueue={
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-border">
                <span className="font-heading font-bold text-xs uppercase tracking-[0.2em] text-muted">
                  RENDER QUEUE
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                {!rendered ? (
                  <div className="space-y-3">
                    <div className="text-muted">
                      <span className="text-primary">&gt;</span> AWAITING RENDER COMMANDS...
                      <span className="blink">_</span>
                    </div>

                    {/* Recording status for selected clips */}
                    {selectedIds.size > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-muted">&gt; SELECTED CLIP STATUS:</div>
                        {withRecordings > 0 && (
                          <div className="text-primary pl-2">
                            {withRecordings} clip{withRecordings !== 1 ? 's' : ''} with screen recordings — READY
                          </div>
                        )}
                        {withoutRecordings > 0 && (
                          <div className="text-accent pl-2">
                            {withoutRecordings} clip{withoutRecordings !== 1 ? 's' : ''} without recordings — GO TO LOGBOOK TO RECORD
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-primary">&gt; RENDER MANIFEST</div>
                    <div className="text-muted">
                      &gt; PLATFORMS: {Array.from(selectedPlatforms).map((id) => ALL_PRESETS.find((p) => p.id === id)?.name).filter(Boolean).join(' + ')}
                    </div>
                    <div className="text-muted">
                      &gt; FILES: {renderedClips.filter((c) => c.status === 'ready').length} x {selectedPlatforms.size} format{selectedPlatforms.size !== 1 ? 's' : ''} = {renderedClips.filter((c) => c.status === 'ready').length * selectedPlatforms.size} total
                    </div>
                    <div className="text-muted mt-2">&gt; QUEUE:</div>

                    {renderedClips.map((clip) => (
                      <div key={clip.breadcrumbId} className="pl-2 space-y-2 pb-3 border-b border-border/30 last:border-0">
                        <div className={clip.status === 'ready' ? 'text-text' : 'text-muted'}>
                          {clip.label}
                          {clip.note && <span className="text-muted"> // {clip.note}</span>}
                        </div>

                        {clip.status === 'ready' && clip.url ? (
                          <div className="space-y-1.5 pl-2">
                            {/* Preview */}
                            <video
                              src={clip.url}
                              className="w-32 h-18 object-cover border border-border mb-2"
                              muted
                              controls
                            />
                            {/* Per-platform download links */}
                            {clip.platforms.map((platform) => {
                              const preset = ALL_PRESETS.find((p) => p.icon === platform);
                              return (
                                <div key={platform} className="flex items-center gap-2">
                                  <span className="text-primary font-bold w-6">{platform}</span>
                                  <span className="text-muted">{preset?.aspectRatio ?? '9:16'}</span>
                                  <a
                                    href={clip.url!}
                                    download={`${clip.label.replace(/[^a-zA-Z0-9]/g, '-')}-${preset?.id ?? platform}.webm`}
                                    className="text-primary hover:text-primary/80 underline"
                                  >
                                    [DOWNLOAD]
                                  </a>
                                  <span className="text-primary">[READY]</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="pl-2 text-accent">
                            [NO RECORDING] — Record in Logbook first
                          </div>
                        )}
                      </div>
                    ))}

                    {renderedClips.some((c) => c.status === 'no-recording') && (
                      <div className="mt-4">
                        <button
                          onClick={() => router.push('/logbook/demo')}
                          className="px-3 py-1.5 bg-surface border border-primary text-primary font-heading text-[11px] uppercase tracking-wider hover:bg-primary hover:text-background transition-colors"
                        >
                          [GO TO LOGBOOK TO RECORD]
                        </button>
                      </div>
                    )}

                    {renderedClips.every((c) => c.status === 'ready') && (
                      <div className="mt-4 text-primary">
                        &gt; ALL CLIPS READY — DOWNLOAD ABOVE
                        <span className="blink">_</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          }
          renderButton={
            <RenderButton
              onClick={handleRender}
              disabled={selectedIds.size === 0}
            />
          }
        />
      </div>
    </div>
  );
}
