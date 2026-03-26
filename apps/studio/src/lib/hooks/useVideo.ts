// @crumb use-video
// [UI] | Video metadata manager | Duration tracker
// why: Hook managing video file state, duration, and metadata for editor components
// in:[video ID, video blob] out:[video metadata object, duration, dimensions] err:[load, metadata errors]
// hazard: No error recovery if video metadata can't be extracted—component renders without duration
// hazard: Metadata caching not implemented—metadata fetched on every component remount
// edge:apps/studio/src/app/console/\[videoId\]/page.tsx -> SERVES
// prompt: Add metadata extraction error handling, implement caching with video ID key

'use client';

import useSWR from 'swr';
import type { Video } from '@/lib/types/domain';

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((d) => d.data);

export function useVideo(videoId: string) {
  const { data, error, mutate } = useSWR<Video>(
    videoId ? `/api/videos/${videoId}` : null,
    fetcher
  );

  return {
    video: data ?? null,
    error,
    isLoading: !data && !error,
    mutate,
  };
}

export function useVideoList() {
  const { data, error, mutate } = useSWR<Video[]>('/api/videos', fetcher);

  return {
    videos: data ?? [],
    error,
    isLoading: !data && !error,
    mutate,
  };
}
