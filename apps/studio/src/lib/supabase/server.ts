// @crumb supabase-server
// INF | database-connectivity | privileged-operations
// why: Server-side Supabase client with service role key for backend API routes, bypassing RLS for internal operations (jobs, outputs, transcoding)
// in:[process.env.NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY] out:[SupabaseClient instance] err:[Missing env vars, invalid key, DB connection timeout]
// hazard: Service role key can bypass all RLS policies; if exposed, attacker gains full database access
// hazard: MVP_USER_ID is hardcoded UUID; removing it will break all existing breadcrumbs (no data migration path)
// edge:./client.ts -> RELATES (browser client counterpart with anon key for user-facing queries)
// edge:../../services/media-processor.ts -> CALLS (downloadFromStorage, uploadToStorage use this client)
// edge:../../services/output.service.ts -> CALLS (all job/output/breadcrumb table operations)
// prompt: Move MVP_USER_ID to environment variable; rotate service role key if source repo ever public; restrict key IP whitelist in Supabase settings

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-side client with service role key for API routes
export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Hardcoded user ID for MVP (no auth flow yet)
export const MVP_USER_ID = '00000000-0000-0000-0000-000000000001';
