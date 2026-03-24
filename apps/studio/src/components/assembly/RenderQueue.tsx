// @crumb render-queue
// [UI] | Job queue display | Render progress
// why: Displays active render jobs and their progress—shows queue status and cancellation
// in:[render jobs array, job status, progress] out:[queue list DOM, progress bars] err:[job fetch, status errors]
// hazard: Queue not persisted—jobs lost on page refresh without server feedback
// hazard: No job cancellation UI—users can't stop running renders
// edge:apps/studio/src/components/assembly/RenderButton.tsx -> RELATES
// prompt: Implement WebSocket/polling for real-time job status, add cancel button per job

'use client';

import type { JobStatus } from '@/lib/types/api';

interface RenderJob {
  id: string;
  label: string;
  status: JobStatus | null;
  fileUrl?: string | null;
}

interface RenderQueueProps {
  jobs: RenderJob[];
}

export function RenderQueue({ jobs }: RenderQueueProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <span className="font-heading font-bold text-xs uppercase tracking-[0.2em] text-muted">
          RENDER QUEUE
        </span>
      </div>

      {/* Terminal-style output */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        {jobs.length === 0 ? (
          <div className="text-muted">
            <span className="text-primary">&gt;</span> AWAITING RENDER COMMANDS...
            <span className="blink">_</span>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="space-y-1">
                <div className="text-muted">
                  <span className="text-primary">&gt;</span> {job.label}
                </div>

                {job.status && (
                  <>
                    <div className="text-muted pl-2">
                      STATUS: {' '}
                      <span className={
                        job.status.status === 'completed' ? 'text-primary' :
                        job.status.status === 'failed' ? 'text-accent' :
                        'text-text'
                      }>
                        {job.status.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {(job.status.status === 'processing' || job.status.status === 'pending') && (
                      <div className="pl-2 flex items-center gap-2">
                        <div className="flex-1 h-[4px] border border-border bg-background">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${job.status.progress}%` }}
                          />
                        </div>
                        <span className="text-muted tabular-nums">
                          {job.status.progress}%
                        </span>
                      </div>
                    )}

                    {/* Download link */}
                    {job.status.status === 'completed' && job.fileUrl && (
                      <div className="pl-2">
                        <a
                          href={job.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline"
                        >
                          [DOWNLOAD]
                        </a>
                      </div>
                    )}

                    {/* Error message */}
                    {job.status.status === 'failed' && job.status.errorMessage && (
                      <div className="pl-2 text-accent">
                        ERROR: {job.status.errorMessage}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
