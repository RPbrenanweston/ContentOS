// @crumb assembly-detail-page
// [UI] | Clip compositor | Export workflow
// why: Assembly page for composing clips into final video—clip selection, ordering, export settings
// in:[videoId, clips, export settings] out:[composer UI, render queue] err:[clip fetch, render errors]
// hazard: Render queue not persisted—if browser crashes, render job is lost without recovery
// hazard: No validation that all clips belong to same video—could assemble cross-video clips unintentionally
// edge:apps/studio/src/components/assembly/AssemblyLayout.tsx -> SERVES
// prompt: Add render queue persistence, validate clip ownership, implement job retry on failure

'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { NavBar } from '@/components/shared/NavBar';
import { AssemblyLayout } from '@/components/assembly/AssemblyLayout';
import { ClipSelector } from '@/components/assembly/ClipSelector';
import { ExportSettings } from '@/components/assembly/ExportSettings';
import { RenderQueue } from '@/components/assembly/RenderQueue';
import { RenderButton } from '@/components/assembly/RenderButton';
import { useVideo } from '@/lib/hooks/useVideo';
import { useBreadcrumbs } from '@/lib/hooks/useBreadcrumbs';
import { useOutputPolling } from '@/lib/hooks/useOutputPolling';
import { formatCompact } from '@/lib/utils/time';
import { PLATFORM_PRESETS } from '@/lib/types/platforms';
import type { JobStatus } from '@/lib/types/api';

interface RenderJob {
  id: string;
  label: string;
  jobId: string;
  status: JobStatus | null;
  fileUrl?: string | null;
}

export default function AssemblyPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  const { video } = useVideo(videoId);
  const { breadcrumbs } = useBreadcrumbs(videoId, video?.durationSeconds ?? null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(PLATFORM_PRESETS.map((p) => p.id)) // Default: all short-form selected
  );
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);
  const [rendering, setRendering] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

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

  // Poll the latest active job
  useOutputPolling({
    jobId: activeJobId,
    onComplete: (outputId) => {
      setRenderJobs((prev) =>
        prev.map((j) =>
          j.jobId === activeJobId
            ? { ...j, status: { id: j.jobId, outputId, status: 'completed', progress: 100, errorMessage: null } }
            : j
        )
      );
      setActiveJobId(null);
      setRendering(false);
      // Fetch output to get fileUrl
      fetch(`/api/outputs/${outputId}`)
        .then((r) => r.json())
        .then(({ data }) => {
          if (data?.fileUrl) {
            setRenderJobs((prev) =>
              prev.map((j) =>
                j.jobId === activeJobId ? { ...j, fileUrl: data.fileUrl } : j
              )
            );
          }
        });
    },
    onError: (message) => {
      setRenderJobs((prev) =>
        prev.map((j) =>
          j.jobId === activeJobId
            ? { ...j, status: { id: j.jobId, outputId: '', status: 'failed', progress: 0, errorMessage: message } }
            : j
        )
      );
      setActiveJobId(null);
      setRendering(false);
    },
  });

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

  const handleRender = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setRendering(true);

    // Generate clips for each selected breadcrumb
    const selected = breadcrumbs.filter((b) => selectedIds.has(b.id));

    for (const bc of selected) {
      try {
        const res = await fetch('/api/outputs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'clip', breadcrumbId: bc.id }),
        });
        const { data } = await res.json();
        if (!data) continue;

        const job: RenderJob = {
          id: crypto.randomUUID(),
          label: `CLIP ${formatCompact(bc.startTimeSeconds)} — ${formatCompact(bc.endTimeSeconds)}`,
          jobId: data.jobId,
          status: { id: data.jobId, outputId: data.outputId, status: 'pending', progress: 0, errorMessage: null },
        };

        setRenderJobs((prev) => [...prev, job]);
        setActiveJobId(data.jobId);
      } catch {
        // Continue with remaining clips
      }
    }
  }, [selectedIds, breadcrumbs]);

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
              clipDurations={breadcrumbs
                .filter((b) => selectedIds.has(b.id))
                .map((b) => b.endTimeSeconds - b.startTimeSeconds)
              }
            />
          }
          renderQueue={
            <RenderQueue jobs={renderJobs} />
          }
          renderButton={
            <RenderButton
              onClick={handleRender}
              disabled={selectedIds.size === 0}
              rendering={rendering}
            />
          }
        />
      </div>
    </div>
  );
}
