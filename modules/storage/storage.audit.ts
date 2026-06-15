import Logger from '@/modules/logger'
import { UploadResult } from './storage.types'
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service'
import { tenantDataSourceFor } from '@/modules/db'
import { UploadedFile } from './entities/uploaded_file.entity'
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service'
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys'
import { isRootTenant } from '@/modules/tenant/tenant.constants'

/**
 * Persist an UploadedFile audit row + increment the tenant_usage.storageBytes
 * counter. Best-effort: failures are logged but do not fail the upload —
 * the file is already in the bucket at this point.
 */
export async function persistUploadAudit(
  tenantId: string,
  userId: string | undefined,
  result: UploadResult,
  mimeType: string,
): Promise<string | undefined> {
  const size = result.size ?? 0
  let uploadedFileId: string | undefined
  try {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(UploadedFile)
    const row = repo.create({
      tenantId,
      userId,
      key: result.key,
      bucket: result.bucket,
      provider: result.provider,
      size,
      mimeType: mimeType || 'application/octet-stream',
      url: result.url,
    })
    const saved = await repo.save(row)
    uploadedFileId = saved.uploadedFileId
    if (size > 0) {
      await TenantUsageService.incrementStorageBytes(tenantId, size)
    }
  } catch (error) {
    Logger.warn(
      `StorageService.persistUploadAudit failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  return uploadedFileId
}

/**
 * Defense-in-depth billing gate for uploads. Asserts the tenant's active
 * plan grants `feature_storage_upload` (BOOLEAN) and that the cumulative
 * `feature_storage_quota_bytes` LIMIT (compared against
 * TenantUsage.storageBytes for the current month) is not exhausted.
 *
 * Root tenant is short-circuited. Best-effort — LIMIT check is not atomic
 * and the post-upload bytes counter increment can briefly push usage
 * above the ceiling under concurrent uploads.
 */
export async function assertStorageFeatureAccess(tenantId: string): Promise<void> {
  if (isRootTenant(tenantId)) return

  await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_STORAGE_UPLOAD)

  const usage = await TenantUsageService.getUsage(tenantId)
  await TenantFeatureGateService.assertFeatureAccess(
    tenantId,
    FEATURE_KEYS.FEATURE_STORAGE_QUOTA_BYTES,
    usage.storageBytes,
  )
}
