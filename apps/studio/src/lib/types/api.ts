// @crumb api-types
// DOM | request-response-contracts | error-handling
// why: TypeScript interfaces for all API request/response bodies and error shapes; single source of truth for client-server schema
// in:[no runtime inputs—compile-time type definitions] out:[ApiResponse ApiError ApiResult union types] err:[Type mismatch on request/response serialization]
// hazard: ApiError.code is string; no enum validation means client code could break on unknown error codes
// hazard: OutputWithJob.jobId is nullable but no guarantee job exists; caller must handle undefined state
// edge:./domain.ts -> READS (imports Breadcrumb Video Output Compilation types)
// edge:../../services/output.service.ts -> RELATES (createOutputJob returns outputId jobId matching ApiResult pattern)
// edge:../../utils/validation.ts -> RELATES (validation schemas use CreateVideoRequest CreateBreadcrumbRequest types)
// prompt: Add error code enum; make jobId required on OutputWithJob or add explicit null handling

import type { Breadcrumb, Video, Output, Compilation, CompilationBreadcrumb } from './domain';

// === Requests ===

export interface CreateVideoRequest {
  sourceType: 'upload' | 'youtube';
  sourceUrl?: string;
  fileUrl?: string;
  title: string;
  durationSeconds?: number;
}

export interface CreateBreadcrumbRequest {
  timestampSeconds: number;
  note?: string;
  tags?: string[];
}

export interface UpdateBreadcrumbRequest {
  startTimeSeconds?: number;
  endTimeSeconds?: number;
  note?: string | null;
  tags?: string[];
  orderIndex?: number;
}

export interface CreateCompilationRequest {
  title: string;
  description?: string;
  breadcrumbIds?: string[];
}

export interface GenerateOutputRequest {
  type: 'clip' | 'post' | 'compilation';
  breadcrumbId?: string;
  compilationId?: string;
}

// === Responses ===

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: { code: string; message: string };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface VideoDetail extends Video {
  breadcrumbs: Breadcrumb[];
}

export interface OutputWithJob extends Output {
  jobId: string | null;
}

export interface CompilationDetail extends Compilation {
  breadcrumbs: (CompilationBreadcrumb & { breadcrumb: Breadcrumb })[];
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputId: string;
  errorMessage: string | null;
  progress: number;
}
