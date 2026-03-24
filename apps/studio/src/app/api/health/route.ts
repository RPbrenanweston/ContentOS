// @crumb health-check-studio
// OPS | Observability | Liveness probe
// why: Expose /api/health for load balancer and monitoring liveness probes without requiring auth
// in:[GET /api/health] out:[{status, checks} 200 if all ok, 503 if any degraded] err:[never throws — all errors captured in checks]
// hazard: This route MUST stay unauthenticated — middleware.ts explicitly skips /api/health; do not add auth here
// hazard: Database check requires SUPABASE_SERVICE_ROLE_KEY; degraded check is expected if key missing in dev
// edge:../../../lib/supabase/server.ts -> CALLS (createServerClient for DB liveness)
// edge:../../../middleware.ts -> SKIPPED_BY (auth middleware bypasses this path intentionally)
// prompt: Add cache-control no-store header to prevent CDN caching of health responses; add version field from package.json

import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {}

  // Check database
  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const client = createServerClient()
    await client.from('studio_videos').select('id').limit(1)
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
