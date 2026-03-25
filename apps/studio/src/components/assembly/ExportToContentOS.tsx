// @crumb export-to-content-os-button
// [UI] | Cross-app export | Content OS bridge
// why: Button to export selected Studio breadcrumbs into Content OS—creates a compilation then exports as content_node + derived_assets
// in:[videoId, selectedBreadcrumbIds] out:[button UI, export status feedback] err:[compilation creation errors, export API errors, network failures]
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

type ExportState = 'idle' | 'creating' | 'exporting' | 'success' | 'error';

export function ExportToContentOS({ videoId, selectedBreadcrumbIds }: ExportToContentOSProps) {
  const [state, setState] = useState<ExportState>('idle');
  const [result, setResult] = useState<{ contentNodeId: string; assetCount: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (selectedBreadcrumbIds.length === 0 || state === 'creating' || state === 'exporting') return;

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
        setErrorMessage(exportJson.error?.message ?? 'Export failed');
        return;
      }

      setState('success');
      setResult(exportJson.data);
    } catch {
      setState('error');
      setErrorMessage('Network error — could not reach server');
    }
  }, [videoId, selectedBreadcrumbIds, state]);

  const disabled = selectedBreadcrumbIds.length === 0 || state === 'creating' || state === 'exporting';

  const label = (() => {
    switch (state) {
      case 'creating': return 'CREATING COMPILATION...';
      case 'exporting': return 'EXPORTING TO CONTENT OS...';
      case 'success': return `EXPORTED (${result?.assetCount ?? 0} ASSETS)`;
      case 'error': return 'EXPORT FAILED — RETRY';
      default: return 'EXPORT TO CONTENT OS';
    }
  })();

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExport}
        disabled={disabled}
        className={`
          w-full py-2
          font-heading font-bold text-[12px] uppercase tracking-[0.15em]
          border-0 cursor-pointer transition-all
          ${disabled
            ? 'bg-border text-muted cursor-not-allowed'
            : state === 'success'
              ? 'bg-green-700 text-white'
              : 'bg-surface text-text hover:bg-primary hover:text-background active:scale-[0.99]'
          }
        `}
      >
        {label}
      </button>

      {state === 'error' && errorMessage && (
        <p className="text-[11px] text-accent font-mono px-1">{errorMessage}</p>
      )}

      {state === 'success' && result && (
        <p className="text-[11px] text-green-600 font-mono px-1">
          Content node: {result.contentNodeId.slice(0, 8)}...
        </p>
      )}
    </div>
  );
}
