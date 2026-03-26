// @crumb mappers
// DOM | data-transformation | db-to-model-conversion
// why: Functions that transform Supabase row data (snake_case columns) into domain objects (camelCase properties); strict typing ensures DB schema mismatches surface early
// in:[DB row Record<string unknown> with snake_case fields] out:[Video Breadcrumb domain types with camelCase] err:[Missing column durationSeconds tags, type coercion failures]
// hazard: mapBreadcrumb casts row.tags to string[] without verification; if DB stores null, could cause runtime error in consuming code
// hazard: durationSeconds coerced with Number(); could return NaN if DB value is non-numeric string (no error thrown)
// edge:../types/domain.ts -> READS (returns Video Breadcrumb interfaces)
// edge:../supabase/server.ts -> RELATES (results from .select() queries passed to these mappers)
// edge:../../services/output.service.ts -> RELATES (mapBreadcrumb used in processClipExtraction to transform API response)
// prompt: Add null checks and explicit type guards; use parseInt/parseFloat with radix instead of Number(); add JSDoc examples of expected input

export function mapVideo(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    fileUrl: row.file_url,
    title: row.title,
    durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBreadcrumb(row: Record<string, unknown>) {
  return {
    id: row.id,
    videoId: row.video_id,
    timestampSeconds: Number(row.timestamp_seconds),
    startTimeSeconds: Number(row.start_time_seconds),
    endTimeSeconds: Number(row.end_time_seconds),
    note: row.note ?? null,
    tags: (row.tags as string[]) ?? [],
    orderIndex: Number(row.order_index),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
