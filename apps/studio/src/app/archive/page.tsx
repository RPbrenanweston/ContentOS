'use client';

import Link from 'next/link';
import { NavBar } from '@/components/shared/NavBar';
import { useVideoList } from '@/lib/hooks/useVideo';
import { formatCompact } from '@/lib/utils/time';

export default function ArchivePage() {
  const { videos, isLoading } = useVideoList();

  return (
    <div className="h-screen flex flex-col bg-background">
      <NavBar />
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h1 className="font-heading font-bold text-sm uppercase tracking-[0.2em] text-muted mb-4">
            ARCHIVE
          </h1>

          {isLoading && (
            <span className="font-mono text-muted text-sm tracking-widest blink">
              LOADING...
            </span>
          )}

          {!isLoading && videos.length === 0 && (
            <span className="font-mono text-muted text-sm tracking-widest">
              [ARCHIVE EMPTY]
            </span>
          )}

          {videos.length > 0 && (
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="text-left text-muted uppercase text-xs tracking-widest border-b border-border">
                  <th className="py-2 px-3">DATE</th>
                  <th className="py-2 px-3">TITLE</th>
                  <th className="py-2 px-3">SOURCE</th>
                  <th className="py-2 px-3">DURATION</th>
                  <th className="py-2 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr
                    key={video.id}
                    className="border-b border-border/50 hover:bg-text hover:text-background transition-colors cursor-pointer group"
                  >
                    <td className="py-2 px-3">
                      <Link href={`/console/${video.id}`} className="text-inherit no-underline">
                        {new Date(video.createdAt).toLocaleDateString('en-US', {
                          year: '2-digit',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <Link href={`/console/${video.id}`} className="text-inherit no-underline font-body">
                        {video.title}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-muted group-hover:text-background/60">
                      {video.sourceType.toUpperCase()}
                    </td>
                    <td className="py-2 px-3 text-muted group-hover:text-background/60">
                      {video.durationSeconds
                        ? formatCompact(video.durationSeconds)
                        : '--:--'}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-primary group-hover:text-background">
                        [ACTIVE]
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
