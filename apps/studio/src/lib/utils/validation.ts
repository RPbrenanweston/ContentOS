// @crumb validation
// DOM | request-validation | zod-schemas
// why: Zod schemas that validate API request payloads; enforce constraints on video metadata breadcrumb timings and output types before DB insert
// in:[untrusted request body] out:[parsed data matching schema or validation error] err:[Invalid type coercion, refine() predicate failure]
// hazard: createVideoSchema refine() only validates sourceType-specific requirements but doesn't check file size or video codec
// hazard: createBreadcrumbSchema allows tags up to 20 items but no uniqueness check; duplicate tags could inflate storage or confuse filtering UI
// edge:../../services/output.service.ts -> RELATES (generateOutputSchema validates clip/compilation/post request types)
// edge:../../types/api.ts -> RELATES (CreateVideoRequest CreateBreadcrumbRequest types used in schemas)
// edge:../supabase/server.ts -> RELATES (schemas run before .insert() calls to prevent DB constraint violations)
// prompt: Add fileSize validation for uploads; enforce unique tags in breadcrumb; add regex validation for sourceUrl format

import { z } from 'zod';

export const createVideoSchema = z.object({
  sourceType: z.enum(['upload', 'youtube']),
  sourceUrl: z.string().url().optional(),
  fileUrl: z.string().optional(),
  title: z.string().min(1).max(500),
  durationSeconds: z.number().positive().optional(),
}).refine(
  (data) => {
    if (data.sourceType === 'youtube') return !!data.sourceUrl;
    if (data.sourceType === 'upload') return !!data.fileUrl;
    return false;
  },
  { message: 'YouTube requires sourceUrl, upload requires fileUrl' }
);

export const createBreadcrumbSchema = z.object({
  timestampSeconds: z.number().min(0),
  note: z.string().max(5000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

export const updateBreadcrumbSchema = z.object({
  startTimeSeconds: z.number().min(0).optional(),
  endTimeSeconds: z.number().min(0).optional(),
  note: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  orderIndex: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    if (data.startTimeSeconds != null && data.endTimeSeconds != null) {
      return data.endTimeSeconds > data.startTimeSeconds;
    }
    return true;
  },
  { message: 'endTimeSeconds must be greater than startTimeSeconds' }
);

export const createCompilationSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  breadcrumbIds: z.array(z.string().uuid()).optional(),
});

export const generateOutputSchema = z.object({
  type: z.enum(['clip', 'post', 'compilation']),
  breadcrumbId: z.string().uuid().optional(),
  compilationId: z.string().uuid().optional(),
}).refine(
  (data) => {
    if (data.type === 'clip' || data.type === 'post') return !!data.breadcrumbId;
    if (data.type === 'compilation') return !!data.compilationId;
    return false;
  },
  { message: 'clip/post requires breadcrumbId, compilation requires compilationId' }
);
