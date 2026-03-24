// @crumb supabase-client
// INF | Initialization | Key management
// why: Provide isolated database client factories for browser, service, and server contexts with proper credential separation
// in:[env vars] out:[SupabaseClient instances] err:[MissingEnvError|ConnectionError]
// hazard: Service key exposed in browser context would bypass row-level security
// hazard: Mixed use of anon/service keys can leak permissions across auth levels
// edge:../repositories/content-node.repo.ts -> SERVES
// edge:../repositories/content-segment.repo.ts -> SERVES
// edge:../../app/api -> SERVES
// prompt: Verify env vars loaded before instantiation; audit caller context (browser vs server)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

/** Browser/client-side Supabase client (uses anon key + RLS) */
export function createBrowserClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** Server-side Supabase client (bypasses RLS for service operations) */
export function createServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/** Server-side client scoped to a user's auth context */
export function createServerClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
