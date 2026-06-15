import Logger from '@/modules/logger'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { UploadFileDTO, UploadFromUrlDTO, DeleteFileDTO, GetFileUrlDTO } from './storage.dto'
import { UploadResult } from './storage.types'
import { STORAGE_MESSAGES } from './storage.messages'
import { tenantDataSourceFor } from '@/modules/db'
import { UploadedFile } from './entities/uploaded_file.entity'
import { IsNull } from 'typeorm'
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service'
import { validateUpload } from './storage.validation'
import { presignS3GetUrl } from './storage.sigv4'
import { getProvider, getStorageSettings, getValidationPolicy } from './storage.provider-factory'
import { persistUploadAudit, assertStorageFeatureAccess } from './storage.audit'

/** Upload a file to storage for a tenant. */
export async function uploadFile(tenantId: string, data: UploadFileDTO): Promise<UploadResult> {
  await assertStorageFeatureAccess(tenantId)

  const { file: rawFile, folder, filename, provider: requestedProvider } = data

  try {
    // Validate content (size, extension, magic bytes) and strip EXIF before
    // anything is written to the bucket.
    const policy = await getValidationPolicy(tenantId)
    const file = await validateUpload(rawFile, policy)

    const { provider, resolvedName } = await getProvider(tenantId, requestedProvider)
    const result = await provider.uploadFile(file, { folder, filename, tenantId })

    const uploadResult: UploadResult = { ...result, provider: resolvedName }
    const uploadedFileId = await persistUploadAudit(tenantId, undefined, uploadResult, file.type)

    return { ...uploadResult, uploadedFileId }
  } catch (error) {
    Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/** Upload a file from URL to storage for a tenant. */
export async function uploadFromUrl(tenantId: string, data: UploadFromUrlDTO): Promise<UploadResult> {
  await assertStorageFeatureAccess(tenantId)

  const { url, folder, filename, provider: requestedProvider } = data

  try {
    const { provider, resolvedName } = await getProvider(tenantId, requestedProvider)
    const result = await provider.uploadFromUrl(url, { url, folder, filename, tenantId })

    const uploadResult: UploadResult = { ...result, provider: resolvedName }
    const uploadedFileId = await persistUploadAudit(tenantId, undefined, uploadResult, 'application/octet-stream')

    return { ...uploadResult, uploadedFileId }
  } catch (error) {
    Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/**
 * Delete a file from a tenant's storage.
 * Soft-deletes the matching UploadedFile audit row so we keep an immutable
 * record of what existed.
 */
export async function deleteFile(tenantId: string, data: DeleteFileDTO): Promise<void> {
  const { key, provider: requestedProvider } = data

  try {
    const { provider } = await getProvider(tenantId, requestedProvider)
    await provider.deleteFile(key)

    try {
      const ds = await tenantDataSourceFor(tenantId)
      const repo = ds.getRepository(UploadedFile)
      const row = await repo.findOne({ where: { tenantId, key, deletedAt: IsNull() } })
      if (row) {
        await repo.softRemove(row)
        if (row.size && row.size > 0) {
          await TenantUsageService.decrementStorageBytes(tenantId, row.size)
        }
      }
    } catch (auditError) {
      Logger.warn(
        `StorageService.deleteFile audit soft-delete failed: ${
          auditError instanceof Error ? auditError.message : String(auditError)
        }`,
      )
    }
  } catch (error) {
    Logger.error(`${STORAGE_MESSAGES.DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/** Get file URL from a tenant's storage. */
export async function getFileUrl(tenantId: string, data: GetFileUrlDTO): Promise<string> {
  const { key, provider: requestedProvider } = data

  try {
    const { provider } = await getProvider(tenantId, requestedProvider)
    return provider.getFileUrl(key)
  } catch (error) {
    Logger.error(`Failed to get file URL: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/**
 * Generate a real, time-limited presigned GET URL (SigV4) for a private
 * object. `expiresSeconds` defaults to 15 minutes.
 */
export async function getPresignedUrl(tenantId: string, key: string, expiresSeconds = 900): Promise<string> {
  const { config } = await getStorageSettings(tenantId)
  if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    throw new AppError(STORAGE_MESSAGES.PROVIDER_NOT_CONFIGURED, 422, ErrorCode.VALIDATION_ERROR)
  }
  return presignS3GetUrl(config, key, expiresSeconds)
}

/**
 * Upload a server-generated buffer (e.g. a data export archive) directly to
 * the tenant's bucket, bypassing the image-oriented upload validation.
 */
export async function uploadServerBuffer(
  tenantId: string,
  data: { buffer: Buffer; filename: string; contentType?: string; folder?: string },
): Promise<UploadResult> {
  const { provider, resolvedName } = await getProvider(tenantId)
  const file = new File([new Uint8Array(data.buffer)], data.filename, { type: data.contentType ?? 'application/octet-stream' })
  const result = await provider.uploadFile(file, { folder: data.folder, filename: data.filename, tenantId })
  const uploadResult: UploadResult = { ...result, provider: resolvedName }
  await persistUploadAudit(tenantId, undefined, uploadResult, data.contentType ?? 'application/octet-stream')
  return uploadResult
}

/**
 * GDPR / KVKK hard delete: permanently remove the object from the bucket AND
 * the audit row (not a soft-delete), decrementing the tenant byte counter.
 */
export async function hardDeleteFile(tenantId: string, data: DeleteFileDTO): Promise<void> {
  const { key, provider: requestedProvider } = data
  const { provider } = await getProvider(tenantId, requestedProvider)
  await provider.deleteFile(key)

  try {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(UploadedFile)
    // withDeleted: also catch rows already soft-deleted.
    const row = await repo.findOne({ where: { tenantId, key }, withDeleted: true })
    if (row) {
      const wasActive = !row.deletedAt
      await repo.remove(row)
      if (wasActive && row.size && row.size > 0) {
        await TenantUsageService.decrementStorageBytes(tenantId, row.size)
      }
    }
  } catch (auditError) {
    Logger.warn(`StorageService.hardDeleteFile audit purge failed: ${auditError instanceof Error ? auditError.message : String(auditError)}`)
  }
}
