// @crumb use-breadcrumbs
// [UI] | Navigation context | Breadcrumb tracking
// why: Hook providing breadcrumb navigation state for location tracking in studio
// in:[current route, path segments] out:[breadcrumb array, navigation functions] err:[state, routing errors]
// hazard: Not integrated with Next.js router—may not update on route changes
// hazard: Breadcrumbs may become stale if router.push called without hook update
// edge:apps/studio/src/components/shared/NavBar.tsx -> SERVES
// prompt: Integrate with useRouter for automatic updates, add route change listener

'use client';

import useSWR from 'swr';
import type { Breadcrumb } from '@/lib/types/domain';
import type { UpdateBreadcrumbRequest } from '@/lib/types/api';
import { clampTimeWindow } from '@/lib/utils/time';

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((d) => d.data);

export function useBreadcrumbs(videoId: string, durationSeconds: number | null) {
  const { data, error, mutate } = useSWR<Breadcrumb[]>(
    `/api/videos/${videoId}/breadcrumbs`,
    fetcher
  );

  const breadcrumbs = data ?? [];

  const createBreadcrumb = async (timestampSeconds: number) => {
    const { startTimeSeconds, endTimeSeconds } = clampTimeWindow(
      timestampSeconds,
      durationSeconds
    );

    const optimistic: Breadcrumb = {
      id: crypto.randomUUID(),
      videoId,
      timestampSeconds,
      startTimeSeconds,
      endTimeSeconds,
      note: null,
      tags: [],
      orderIndex: breadcrumbs.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await mutate(
      async (current) => {
        const res = await fetch(`/api/videos/${videoId}/breadcrumbs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestampSeconds }),
        });
        const { data: created } = await res.json();
        if (!created) return current;
        return [...(current ?? []).filter((b) => b.id !== optimistic.id), created].sort(
          (a, b) => a.timestampSeconds - b.timestampSeconds
        );
      },
      {
        optimisticData: [...breadcrumbs, optimistic].sort(
          (a, b) => a.timestampSeconds - b.timestampSeconds
        ),
        rollbackOnError: true,
      }
    );
  };

  const updateBreadcrumb = async (id: string, updates: UpdateBreadcrumbRequest) => {
    const updated = breadcrumbs.map((b) =>
      b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
    );

    await mutate(
      async () => {
        const res = await fetch(`/api/videos/${videoId}/breadcrumbs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const { data: result } = await res.json();
        if (!result) return breadcrumbs;
        return breadcrumbs
          .map((b) => (b.id === id ? result : b))
          .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
      },
      {
        optimisticData: updated.sort((a, b) => a.timestampSeconds - b.timestampSeconds),
        rollbackOnError: true,
      }
    );
  };

  const deleteBreadcrumb = async (id: string) => {
    await mutate(
      async (current) => {
        await fetch(`/api/videos/${videoId}/breadcrumbs/${id}`, { method: 'DELETE' });
        return (current ?? []).filter((b) => b.id !== id);
      },
      {
        optimisticData: breadcrumbs.filter((b) => b.id !== id),
        rollbackOnError: true,
      }
    );
  };

  return {
    breadcrumbs,
    error,
    isLoading: !data && !error,
    createBreadcrumb,
    updateBreadcrumb,
    deleteBreadcrumb,
  };
}
