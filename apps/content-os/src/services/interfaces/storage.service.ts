/**
 * @crumb
 * id: storage-abstraction-interface
 * AREA: INF
 * why: Define contract for S3-compatible storage operations—abstract Supabase Storage behind testable interface
 * in: UploadResult {url, path, size}; upload input {file/buffer, path, contentType}
 * out: UploadResult {url (public), path, size}; signedUrl (string); delete void
 * err: No errors typed—implementation must handle auth, network, and bucket errors
 * hazard: getSignedUrl() lacks expiration validation—default expiresInSeconds unknown, callers cannot predict URL lifetime
 * hazard: delete() provides no confirmation—orphaned file references in database persisting after storage deletion
 * edge: IMPLEMENTED_BY (no current implementation found—interface only)
 * edge: CALLED_BY media.service.ts (clip and thumbnail uploads); distribution adapters (media URL uploads)
 * edge: READS bucket credentials and base paths from Supabase client configuration
 * edge: WRITES S3-compatible storage (clips/, thumbnails/, assets/ buckets)
 * prompt: Test upload with oversized files; verify getSignedUrl expiration; validate delete idempotency (missing files should not error)
 */

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

export interface IStorageService {
  upload(
    file: File | Buffer,
    path: string,
    contentType: string,
  ): Promise<UploadResult>;

  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;

  delete(path: string): Promise<void>;
}
