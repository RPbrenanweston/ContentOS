// @crumb pagination-utility
// LIB | pagination | query-params
// why: Shared utility for consistent limit/offset pagination across all list endpoints; prevents unbounded queries
// in:[URLSearchParams] out:[{limit, offset}] | in:[data[], total, headers?] out:[Response with x-total-count header]
// edge: USED_BY api/content/route.ts, api/content/[id]/segments/route.ts, api/distribution/jobs/route.ts, api/analytics/route.ts

import { NextResponse } from 'next/server';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function parsePagination(searchParams: URLSearchParams): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);
  return { limit, offset };
}

export function paginatedResponse(data: unknown[], total: number, headers?: Headers): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('x-total-count', String(total));
  responseHeaders.set('content-type', 'application/json');
  return new Response(JSON.stringify(data), { status: 200, headers: responseHeaders });
}

export function paginatedJsonResponse(
  body: Record<string, unknown>,
  total: number,
  headers?: Headers,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('x-total-count', String(total));
  return NextResponse.json(body, { headers: responseHeaders });
}
