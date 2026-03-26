// @crumb media-cleanup-job
// INF | background-job | storage-hygiene
// why: Find and surface orphaned storage files not referenced by any live content_node or derived_asset; prevents unbounded storage cost growth
// in:[SupabaseClient] out:[string[] of orphaned storage paths] err:[db-query-failure]
// hazard: Storage list API is paginated—large buckets (10k+ files) require recursive pagination to find all files
// hazard: Race condition: file uploaded but not yet inserted into DB row will appear as orphaned; add a grace period check (e.g., files older than 1 hour)
// edge: READS content_nodes.source_url, derived_assets.media_url
// edge: READS storage bucket file list
// edge: CALLED_BY cron or admin endpoint (not shown)
// prompt: Add grace period filter (created > 1 hour ago); implement storage list pagination; add dry-run flag before deletion

import type { SupabaseClient } from '@supabase/supabase-js';

const ORPHAN_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour — avoids flagging recently uploaded files

/**
 * Find storage file paths not referenced by any live content_node or derived_asset.
 *
 * Returns an array of storage paths (bucket-relative) that can be safely deleted.
 * Does not delete — callers decide whether to delete.
 */
export async function findOrphanedMedia(client: SupabaseClient): Promise<string[]> {
  // Collect all URLs referenced in the database
  const [contentNodeResult, derivedAssetResult] = await Promise.all([
    client.from('content_nodes').select('source_url').not('source_url', 'is', null),
    client.from('derived_assets').select('media_url').not('media_url', 'is', null),
  ]);

  if (contentNodeResult.error) throw contentNodeResult.error;
  if (derivedAssetResult.error) throw derivedAssetResult.error;

  const referencedUrls = new Set<string>([
    ...(contentNodeResult.data ?? []).map((r: { source_url: string }) => r.source_url),
    ...(derivedAssetResult.data ?? []).map((r: { media_url: string }) => r.media_url),
  ]);

  // List all files in storage — paginate through all results
  const allStorageFiles = await listAllStorageFiles(client, 'media');

  // Grace period: skip files newer than ORPHAN_GRACE_PERIOD_MS
  const cutoff = Date.now() - ORPHAN_GRACE_PERIOD_MS;

  const orphaned: string[] = [];
  for (const file of allStorageFiles) {
    // Filter by grace period if metadata is available
    if (file.created_at) {
      const createdAt = new Date(file.created_at).getTime();
      if (createdAt > cutoff) continue;
    }

    // Check if the file path is referenced by any DB record
    const isReferenced = [...referencedUrls].some((url) => url.includes(file.name));
    if (!isReferenced) {
      orphaned.push(file.name);
    }
  }

  return orphaned;
}

/**
 * Paginate through all files in a storage bucket folder.
 */
async function listAllStorageFiles(
  client: SupabaseClient,
  bucket: string,
  folder = '',
): Promise<Array<{ name: string; created_at?: string }>> {
  const PAGE_SIZE = 100;
  const results: Array<{ name: string; created_at?: string }> = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(folder, {
      limit: PAGE_SIZE,
      offset,
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    results.push(
      ...data.map((f) => ({
        name: folder ? `${folder}/${f.name}` : f.name,
        created_at: f.created_at,
      })),
    );

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return results;
}
