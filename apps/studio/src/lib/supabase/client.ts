// @crumb supabase-client
// INF | database-connectivity | browser-auth
// why: Browser-side Supabase client initialized with anon key for frontend API calls, handling real-time subscriptions and row-level security
// in:[process.env.NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY] out:[SupabaseClient instance] err:[Missing env vars, network failure on first query]
// hazard: NEXT_PUBLIC keys are visible to all clients; anon role must have strict RLS policies or data leaks occur
// hazard: Client auth token stored in localStorage; malicious XSS can extract JWT and impersonate user
// edge:./server.ts -> RELATES (server-side counterpart with service role for privileged operations)
// edge:../../services/media-processor.ts -> RELATES (uploadToStorage uses server client, not browser client)
// edge:infra/supabase/docker-compose.yml -> READS
// prompt: Audit RLS policies for all tables; implement Content Security Policy headers to prevent XSS token theft

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
