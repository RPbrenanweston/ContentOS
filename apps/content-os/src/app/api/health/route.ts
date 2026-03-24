// @crumb health-check-content-os
// OPS | Observability | Liveness probe
// why: Expose /api/health for load balancer and monitoring liveness probes without requiring auth
// in:[GET /api/health] out:[{status, checks} 200 if all ok, 503 if any degraded] err:[never throws — all errors captured in checks]
// hazard: This route MUST stay unauthenticated — middleware.ts explicitly skips /api/health; do not add auth here
// hazard: Database check uses createServiceClient which requires SUPABASE_SERVICE_KEY; degraded check is expected if key missing in dev
// edge:../../../infrastructure/supabase/client.ts -> CALLS (createServiceClient for DB liveness)
// edge:../../../middleware.ts -> SKIPPED_BY (auth middleware bypasses this path intentionally)
// prompt: Add cache-control no-store header to prevent CDN caching of health responses; add version field from package.json

import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  // Check database
  try {
    const { createServiceClient } = await import('@/infrastructure/supabase/client')
    const client = createServiceClient()
    await client.from('content_nodes').select('id').limit(1)
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  const allHealthy = Object.values(checks).every(v => v === 'ok')

  return NextResponse.json(
    { status: allHealthy ? 'healthy' : 'degraded', checks },
    { status: allHealthy ? 200 : 503 }
  )
}
