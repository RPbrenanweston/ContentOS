// @crumb use-demo-state
// [UI] | Demo mode manager | Test state
// why: Hook managing demo/test state for showing sample data without real video
// in:[demo flag, sample data] out:[demo data object, setter functions] err:[state errors]
// hazard: Demo state global—affects all instances using hook simultaneously
// hazard: No cleanup—demo mode persists across route changes if not reset
// edge:apps/studio/src/app/console/demo/page.tsx -> SERVES
// prompt: Use Context API for scoped demo state, implement automatic reset on route change

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Breadcrumb } from '@/lib/types/domain';
import type { UpdateBreadcrumbRequest } from '@/lib/types/api';
import { clampTimeWindow } from '@/lib/utils/time';

import type { RecordingResult } from './useScreenRecorder';

const STORAGE_KEY = 'breadcrumb-studio-demo';

// In-memory store for recordings (blobs can't go in sessionStorage)
const recordingsMap = new Map<string, RecordingResult>();

interface DemoState {
  youtubeUrl: string | null;
  breadcrumbs: Breadcrumb[];
  duration: number | null;
}

function loadState(): DemoState {
  if (typeof window === 'undefined') return { youtubeUrl: null, breadcrumbs: [], duration: null };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { youtubeUrl: null, breadcrumbs: [], duration: null };
  } catch {
    return { youtubeUrl: null, breadcrumbs: [], duration: null };
  }
}

function saveState(state: DemoState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function useDemoState(youtubeUrl?: string | null) {
  const [state, setState] = useState<DemoState>(() => {
    const loaded = loadState();
    // If a new URL is provided, use it; otherwise use stored
    if (youtubeUrl && youtubeUrl !== loaded.youtubeUrl) {
      return { youtubeUrl, breadcrumbs: [], duration: null };
    }
    return loaded;
  });

  // Persist on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const breadcrumbs = state.breadcrumbs;
  const duration = state.duration;

  const setDuration = useCallback((d: number) => {
    setState((prev) => ({ ...prev, duration: d }));
  }, []);

  const createBreadcrumb = useCallback((timestampSeconds: number) => {
    setState((prev) => {
      const { startTimeSeconds, endTimeSeconds } = clampTimeWindow(timestampSeconds, prev.duration);
      const bc: Breadcrumb = {
        id: crypto.randomUUID(),
        videoId: 'demo',
        timestampSeconds,
        startTimeSeconds,
        endTimeSeconds,
        note: null,
        tags: [],
        orderIndex: prev.breadcrumbs.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [...prev.breadcrumbs, bc].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
      return { ...prev, breadcrumbs: updated };
    });
  }, []);

  const updateBreadcrumb = useCallback((id: string, updates: UpdateBreadcrumbRequest) => {
    setState((prev) => {
      const updated = prev.breadcrumbs.map((bc) => {
        if (bc.id !== id) return bc;
        return {
          ...bc,
          ...(updates.startTimeSeconds != null && { startTimeSeconds: updates.startTimeSeconds }),
          ...(updates.endTimeSeconds != null && { endTimeSeconds: updates.endTimeSeconds }),
          ...(updates.note !== undefined && { note: updates.note ?? null }),
          ...(updates.tags !== undefined && { tags: updates.tags }),
          ...(updates.orderIndex != null && { orderIndex: updates.orderIndex }),
          updatedAt: new Date().toISOString(),
        };
      });
      return { ...prev, breadcrumbs: updated };
    });
  }, []);

  const deleteBreadcrumb = useCallback((id: string) => {
    recordingsMap.delete(id);
    setState((prev) => ({
      ...prev,
      breadcrumbs: prev.breadcrumbs.filter((bc) => bc.id !== id),
    }));
  }, []);

  const addRecording = useCallback((breadcrumbId: string, recording: RecordingResult) => {
    recordingsMap.set(breadcrumbId, recording);
    // Force a state update so components re-render
    setState((prev) => ({ ...prev }));
  }, []);

  const getRecording = useCallback((breadcrumbId: string): RecordingResult | undefined => {
    return recordingsMap.get(breadcrumbId);
  }, []);

  const hasRecording = useCallback((breadcrumbId: string): boolean => {
    return recordingsMap.has(breadcrumbId);
  }, []);

  const getAllRecordings = useCallback((): Map<string, RecordingResult> => {
    return new Map(recordingsMap);
  }, []);

  return {
    youtubeUrl: state.youtubeUrl,
    breadcrumbs,
    duration,
    setDuration,
    createBreadcrumb,
    updateBreadcrumb,
    deleteBreadcrumb,
    addRecording,
    getRecording,
    hasRecording,
    getAllRecordings,
  };
}
