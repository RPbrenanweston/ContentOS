// @crumb env-validation-content-os
// CFG | Startup | Environment validation
// why: Fail fast at startup with clear error messages when required environment variables are missing or malformed
// in:[process.env] out:[validated env object] err:[throws Error with list of missing/invalid vars]
// hazard: This module executes at import time — import it early (e.g. in layout or instrumentation) so startup fails fast
// hazard: SUPABASE_SERVICE_KEY and API keys are optional here to allow frontend-only deployments; services that need them must check themselves
// edge:../infrastructure/supabase/client.ts -> RELATES (consumes NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY)
// edge:../services/transcript.service.ts -> RELATES (consumes DEEPGRAM_API_KEY indirectly)
// prompt: Add NODE_ENV, DATABASE_URL, and any third-party keys as the app grows; keep optional vars documented here

import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Missing or invalid environment variables:\n${missing}`)
  }
  return result.data
}

export const env = validateEnv()
