// @crumb supabase-transaction-helper
// INF | Utility | Transaction wrapping
// why: Provide a consistent wrapper for multi-step Supabase operations that logs failure context and re-throws for pg-boss retry semantics
// in:[async fn receiving SupabaseClient] out:[T result of fn] err:[TransactionError (re-thrown from fn)]
// hazard: Supabase JS client does not natively support multi-statement transactions; this wrapper does NOT provide atomicity
// hazard: Callers that need true atomicity must use supabase.rpc() pointing to a PL/pgSQL function that runs in a single transaction
// edge:./client.ts -> IMPORTS
// edge:../queue/workers.ts -> CALLED_BY
// prompt: For true atomicity, move delete+create into a Postgres function and call via supabase.rpc('upsert_segments', {...})

import { createServiceClient } from './client';

/**
 * Wraps a set of Supabase operations with structured error logging.
 *
 * NOTE: This does NOT provide true PostgreSQL ACID transaction guarantees.
 * The Supabase JS client issues each operation as a separate HTTP request.
 * For atomic delete+recreate patterns, migrate to supabase.rpc() with a
 * server-side Postgres function.
 *
 * Use this wrapper to:
 *  - Centralize failure logging with caller context
 *  - Signal intent that grouped operations should be treated atomically
 *  - Make future migration to RPC-based transactions straightforward
 */
export async function withTransaction<T>(
  label: string,
  fn: (client: ReturnType<typeof createServiceClient>) => Promise<T>,
): Promise<T> {
  const client = createServiceClient();

  try {
    const result = await fn(client);
    return result;
  } catch (error) {
    console.error(`[Transaction:${label}] Failed:`, error);
    throw error;
  }
}
