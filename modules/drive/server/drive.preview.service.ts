import StorageService from '@kuraykaraaslan/storage/server/storage.service';

// previewKindFor lives in drive.policy (dependency-free, unit-tested); re-export
// it here so callers can get both the classifier and the presigner in one place.
export { previewKindFor, type PreviewKind } from './drive.policy';

/**
 * Build a time-limited presigned URL for a stored object so the browser can
 * preview or download it directly without exposing bucket credentials.
 * `expiresSeconds` defaults to 15 minutes.
 */
export function presignedUrlFor(
  tenantId: string,
  storageKey: string,
  expiresSeconds = 900,
): Promise<string> {
  return StorageService.getPresignedUrl(tenantId, storageKey, expiresSeconds);
}
