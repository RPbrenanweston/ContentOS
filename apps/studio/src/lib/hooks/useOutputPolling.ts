// @crumb use-output-polling
// [UI] | Job status poller | Progress tracker
// why: Hook polling render job status and updating component state with progress
// in:[job ID, polling interval] out:[job status object, progress percentage] err:[fetch, polling errors]
// hazard: Polling interval hard-coded—may hit API rate limits with many users
// hazard: No exponential backoff—continues polling even if server is unresponsive
// edge:apps/studio/src/components/assembly/RenderQueue.tsx -> CALLS
// prompt: Make polling interval configurable, implement exponential backoff on failures

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { JobStatus } from '@/lib/types/api';

interface UseOutputPollingOptions {
  jobId: string | null;
  onComplete?: (outputId: string) => void;
  onError?: (message: string) => void;
  intervalMs?: number;
}

export function useOutputPolling({
  jobId,
  onComplete,
  onError,
  intervalMs = 2000,
}: UseOutputPollingOptions) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const { data } = await res.json();
        if (!data) return;

        setStatus(data);

        if (data.status === 'completed') {
          stopPolling();
          onComplete?.(data.outputId);
        } else if (data.status === 'failed') {
          stopPolling();
          onError?.(data.errorMessage ?? 'Job failed');
        }
      } catch {
        // Silently retry on network errors
      }
    };

    // Poll immediately, then on interval
    poll();
    intervalRef.current = setInterval(poll, intervalMs);

    return stopPolling;
  }, [jobId, intervalMs, onComplete, onError, stopPolling]);

  return { status, stopPolling };
}
