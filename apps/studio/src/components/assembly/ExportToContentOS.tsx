// @crumb export-to-content-os-button
// [UI] | Cross-app export | Content OS bridge
// why: Button to export selected Studio breadcrumbs into Content OS—creates a compilation then exports as content_node + derived_assets
// in:[videoId, selectedBreadcrumbIds] out:[button UI, confirmation dialog, export status feedback] err:[compilation creation errors, export API errors, network failures]
// hazard: No idempotency—user can click multiple times creating duplicate content nodes and compilations
// hazard: Two-step process (create compilation then export) has partial-failure risk if export step fails after compilation created
// edge:apps/studio/src/app/api/videos/[videoId]/compilations/route.ts -> CALLS (creates compilation)
// edge:apps/studio/src/app/api/compilations/[id]/export/route.ts -> CALLS (exports to Content OS)
// edge:apps/studio/src/components/assembly/AssemblyLayout.tsx -> SERVED_BY
// prompt: Add idempotency guard via metadata check; consider single combined endpoint; disable after success

'use client';

import { useState, useCallback } from 'react';

interface ExportToContentOSProps {
  videoId: string;
  selectedBreadcrumbIds: string[];
}

type ExportState = 'idle' | 'confirming' | 'creating' | 'exporting' | 'success' | 'error';

const CONTENT_OS_URL = process.env.NEXT_PUBLIC_CONTENT_OS_URL ?? 'http://localhost:3000';

export function ExportToContentOS({ videoId, selectedBreadcrumbIds }: ExportToContentOSProps) {
  const [state, setState] = useState<ExportState>('idle');
  const [result, setResult] = useState<{ contentNodeId: string; assetCount: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestExport = useCallback(() => {
    if (selectedBreadcrumbIds.length === 0) return;
    setState('confirming');
  }, [selectedBreadcrumbIds]);

  const handleCancel = useCallback(() => {
    setState('idle');
  }, []);

  const handleConfirmExport = useCallback(async () => {
    if (selectedBreadcrumbIds.length === 0) return;

    setState('creating');
    setErrorMessage(null);

    try {
      // Step 1: Create a compilation from selected breadcrumbs
      const compRes = await fetch(`/api/videos/${videoId}/compilations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Assembly export — ${new Date().toISOString().slice(0, 16)}`,
          breadcrumbIds: selectedBreadcrumbIds,
        }),
      });

      const compJson = await compRes.json();

      if (!compRes.ok || compJson.error || !compJson.data?.id) {
        setState('error');
        setErrorMessage(compJson.error?.message ?? 'Failed to create compilation');
        return;
      }

      const compilationId = compJson.data.id as string;

      // Step 2: Export the compilation to Content OS
      setState('exporting');

      const exportRes = await fetch(`/api/compilations/${compilationId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const exportJson = await exportRes.json();

      if (!exportRes.ok || exportJson.error) {
        setState('error');
        setErrorMessage(exportJson.error?.message ?? 'Export to Content OS failed');
        return;
      }

      setState('success');
      setResult(exportJson.data);
    } catch {
      setState('error');
      setErrorMessage('Network error — could not reach server');
    }
  }, [videoId, selectedBreadcrumbIds]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setErrorMessage(null);
    setResult(null);
  }, []);

  // Confirmation dialog overlay — render before computing button state
  if (state === 'confirming') {
    return (
      <div className="flex flex-col gap-3 border border-border p-4 bg-surface">
        <p className="font-mono text-[11px] text-muted uppercase tracking-widest">
          Confirm Export
        </p>
        <p className="font-mono text-[12px] text-text leading-relaxed">
          Export this compilation to Content OS? It will create a new content node with{' '}
          <span className="text-primary font-bold">{selectedBreadcrumbIds.length}</span> clip
          {selectedBreadcrumbIds.length === 1 ? '' : 's'}.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleConfirmExport}
            className="flex-1 py-2 font-heading font-bold text-[12px] uppercase tracking-[0.15em] bg-primary text-background border-0 cursor-pointer hover:bg-primary/90 active:scale-[0.99] transition-all"
          >
            Confirm
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-2 font-heading font-bold text-[12px] uppercase tracking-[0.15em] bg-border text-text border-0 cursor-pointer hover:bg-border/80 active:scale-[0.99] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const isLoading = state === 'creating' || state === 'exporting';
  const isDisabled = selectedBreadcrumbIds.length === 0 || isLoading || state === 'success';

  const buttonLabel = (() => {
    if (state === 'creating') return 'CREATING COMPILATION...';
    if (state === 'exporting') return 'SENDING TO CONTENT OS...';
    if (state === 'success') return `SENT TO CONTENT OS (${result?.assetCount ?? 0} ASSETS)`;
    if (state === 'error') return 'SEND FAILED — RETRY';
    return 'SEND TO CONTENT OS';
  })();

  const buttonClassName = (() => {
    const base = 'w-full py-2 font-heading font-bold text-[12px] uppercase tracking-[0.15em] border-0 cursor-pointer transition-all';
    if (state === 'success') return `${base} bg-green-700 text-white cursor-default`;
    if (state === 'error') return `${base} bg-accent text-white hover:bg-accent/90 active:scale-[0.99]`;
    if (isDisabled) return `${base} bg-border text-muted cursor-not-allowed`;
    return `${base} bg-surface text-text hover:bg-primary hover:text-background active:scale-[0.99]`;
  })();

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={state === 'error' ? handleRetry : handleRequestExport}
        disabled={isDisabled}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>

      {state === 'error' && errorMessage && (
        <p className="text-[11px] text-accent font-mono px-1">{errorMessage}</p>
      )}

      {state === 'success' && result && (
        <a
          href={`${CONTENT_OS_URL}/content/${result.contentNodeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-green-600 font-mono px-1 underline hover:text-green-500 transition-colors"
        >
          View content node in Content OS &rarr;
        </a>
      )}
    </div>
  );
}
