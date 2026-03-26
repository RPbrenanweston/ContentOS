import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses RLS.
 * Only use for:
 * - Token encryption/decryption (pgcrypto functions)
 * - OAuth callbacks (user not authenticated via cookie)
 * - Background job processing
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
