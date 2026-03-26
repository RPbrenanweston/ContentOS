// @crumb domain-types
// DOM | data-model-contracts | database-schema-mirror
// why: Core domain entity interfaces (Video Breadcrumb Output Compilation) that mirror Supabase table schema and enforce type safety across application
// in:[no runtime—compile-time type definitions from DB schema] out:[Domain entity types with id userId timestamps] err:[Field name mismatch between DB and TS, type coercion bugs]
// hazard: userId and timestamps are strings from DB; no validation that they're valid UUIDs or ISO dates on conversion
// hazard: Breadcrumb.tags array stored as JSON in Supabase; if corrupted, mapBreadcrumb will fail at runtime
// edge:./api.ts -> WRITES (imported by api.ts for request/response enrichment)
// edge:../utils/mappers.ts -> RELATES (mapVideo mapBreadcrumb convert DB rows to these types)
// edge:../../services/video-source-resolver.ts -> RELATES (sourceType enum 'upload' | 'youtube' matches VideoSourceType)
// prompt: Add Date-typed createdAt/updatedAt instead of string; validate tags array is non-empty before insert; add optional index hints for queries on videoId

export type VideoSourceType = 'upload' | 'youtube';

export interface Video {
  id: string;
  userId: string;
  sourceType: VideoSourceType;
  sourceUrl: string | null;
  fileUrl: string | null;
  title: string;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Breadcrumb {
  id: string;
  videoId: string;
  timestampSeconds: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  note: string | null;
  tags: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type OutputType = 'clip' | 'post' | 'compilation';
export type OutputStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Output {
  id: string;
  breadcrumbId: string | null;
  compilationId: string | null;
  type: OutputType;
  textContent: string | null;
  fileUrl: string | null;
  status: OutputStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Compilation {
  id: string;
  videoId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompilationBreadcrumb {
  id: string;
  compilationId: string;
  breadcrumbId: string;
  orderIndex: number;
}
