/**
 * @crumb
 * id: api-handler-wrapper
 * AREA: API
 * why: Wrap all API route handlers with consistent auth extraction, Zod validation, correlation IDs, and sanitized error responses—eliminate boilerplate and prevent internal detail leaks
 * in: handler (async fn receiving ApiContext), options.schema (optional ZodSchema for body validation)
 * out: Next.js route handler function; every response carries x-request-id header
 * err: Zod parse failures → 400 "Invalid request body" (schema details never exposed); known errors with statusCode < 500 → that status + message; all 5xx → 500 "Internal server error"
 * hazard: userId will be empty string when x-user-id header is absent—callers must treat empty userId as unauthenticated
 * hazard: request.json() failure silently returns {}—handlers receiving {} body may behave unexpectedly if they expect a non-empty body
 * edge: DEPENDS_ON next/server (NextRequest, NextResponse)
 * edge: DEPENDS_ON zod (ZodSchema, ZodError)
 * edge: CALLED_BY all API route handlers in apps/content-os
 * edge: COMPLEMENTS apps/studio/src/lib/api-handler.ts (identical contract, separate deployment unit)
 * prompt: Verify userId is never empty in routes that require auth; test Zod parse error path returns 400 without schema details; test 5xx sanitization for DistributionError (502)
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

export interface ApiContext<T = unknown> {
  userId: string
  body: T
  requestId: string
  request: NextRequest
  params: Record<string, string>
}

export interface ApiHandlerOptions<T> {
  schema?: ZodSchema<T>
}

export function withApiHandler<T = unknown>(
  handler: (ctx: ApiContext<T>) => Promise<NextResponse>,
  options?: ApiHandlerOptions<T>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (request: NextRequest, routeContext?: any) => {
    const requestId = crypto.randomUUID()

    try {
      const userId = request.headers.get('x-user-id') ?? ''
      const params = routeContext?.params ? await routeContext.params : {}

      let body: T = {} as T

      if (options?.schema) {
        const raw = await request.json().catch(() => ({}))
        const result = options.schema.safeParse(raw)

        if (!result.success) {
          const firstError = result.error.errors[0]
          const errorMessage = firstError?.message || 'Invalid request body'

          return NextResponse.json(
            { error: 'Bad Request', message: errorMessage },
            { status: 400, headers: { 'x-request-id': requestId } },
          )
        }

        body = result.data
      }

      const response = await handler({ userId, body, requestId, request, params })
      response.headers.set('x-request-id', requestId)
      return response
    } catch (error: unknown) {
      // Explicit Zod guard — safeParse is preferred, but thrown ZodErrors are
      // treated as validation failures and never expose schema internals.
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid request body' },
          { status: 400, headers: { 'x-request-id': requestId } },
        )
      }

      const statusCode: number =
        typeof (error as Record<string, unknown>)?.statusCode === 'number'
          ? ((error as Record<string, unknown>).statusCode as number)
          : 500

      // Sanitize: only surface the error message for client errors (4xx).
      // All server errors (5xx) receive a generic message regardless of
      // the original error content—this includes 502 DistributionErrors.
      const isClientError = statusCode >= 400 && statusCode < 500
      const message = isClientError
        ? ((error as Error)?.message ?? 'Request failed')
        : 'Internal server error'

      return NextResponse.json(
        {
          error: isClientError ? 'Bad Request' : 'Internal Server Error',
          message,
        },
        { status: statusCode, headers: { 'x-request-id': requestId } },
      )
    }
  }
}
