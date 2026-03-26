// @crumb env-validation-studio
// CFG | Startup | Environment validation
// why: Fail fast at startup with clear error messages when required environment variables are missing or malformed
// in:[process.env] out:[validated env object] err:[throws Error with list of missing/invalid vars]
// hazard: This module executes at import time — import it early (e.g. in layout or instrumentation) so startup fails fast
// edge:../lib/supabase/client.ts -> RELATES (consumes NEXT_PUBLIC_SUPABASE_URL)
// edge:../lib/supabase/server.ts -> RELATES (consumes SUPABASE_SERVICE_ROLE_KEY)
// prompt: Add SUPABASE_SERVICE_ROLE_KEY validation once auth is fully wired in studio

import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
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
