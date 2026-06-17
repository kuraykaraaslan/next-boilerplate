import Logger from '@kuraykaraaslan/logger'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { UploadFileDTO, UploadFromUrlDTO, DeleteFileDTO, GetFileUrlDTO } from './storage.dto'
import { UploadResult } from './storage.types'
import { STORAGE_MESSAGES } from './storage.messages'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import { UploadedFile } from './entities/uploaded_file.entity'
import { IsNull } from 'typeorm'
import { TenantUsageService } from '@kuraykaraaslan/tenant_usage/server/tenant_usage.service'
import { validateUpload } from './storage.validation'
import { presignS3GetUrl } from './storage.sigv4'
import { getProvider, getStorageSettings, getValidationPolicy } from './storage.provider-factory'
import { persistUploadAudit, assertStorageFeatureAccess } from './storage.audit'
import { getScanConfig } from './storage.scanner-factory'
import { scan } from './storage.scan.service'
import { enqueueVirusScan } from './storage.scan.job'
import type { VirusScanStatus } from './storage.scan.enums'

/** Upload a file to storage for a tenant. */
export async function uploadFile(tenantId: string, data: UploadFileDTO): Promise<UploadResult> {
  await assertStorageFeatureAccess(tenantId)

  const { file: rawFile, folder, filename, provider: requestedProvider, userId, origin } = data

  try {
    // Validate content (size, extension, magic bytes) and strip EXIF before
    // anything is written to the bucket. `mimeType` is content-derived, not the
    // client's spoofable header.
    const policy = await getValidationPolicy(tenantId)
    const { file, mimeType } = await validateUpload(rawFile, policy)

    const scanCfg = await getScanConfig(tenantId)
    let scanStatus: VirusScanStatus = scanCfg.enabled ? 'pending' : 'skipped'

    // Synchronous mode: scan BEFORE the bytes reach the bucket so an infected
    // file is never stored or served.
    if (scanCfg.enabled && scanCfg.mode === 'sync') {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const res = await scan(scanCfg, bytes, file.name)
      if (res.status === 'infected') {
        throw new AppError(STORAGE_MESSAGES.SCAN_INFECTED, 422, ErrorCode.VALIDATION_ERROR)
      }
      scanStatus = res.status // 'clean' | 'error'
    }

    const { provider, resolvedName } = await getProvider(tenantId, requestedProvider)
    const result = await provider.uploadFile(file, { folder, filename, tenantId })

    const uploadResult: UploadResult = { ...result, provider: resolvedName }
    const uploadedFileId = await persistUploadAudit(tenantId, userId, uploadResult, mimeType, scanStatus, origin)

    // Asynchronous mode: object is stored as 'pending'; scan in the background.
    if (scanCfg.enabled && scanCfg.mode === 'async' && uploadedFileId) {
      await enqueueVirusScan(uploadedFileId, result.key, tenantId).catch((e) =>
        Logger.warn(`enqueue virus scan failed: ${e instanceof Error ? e.message : String(e)}`),
      )
    }

    return { ...uploadResult, uploadedFileId }
  } catch (error) {
    Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/** Upload a file from URL to storage for a tenant. */
export async function uploadFromUrl(tenantId: string, data: UploadFromUrlDTO): Promise<UploadResult> {
  await assertStorageFeatureAccess(tenantId)

  const { url, folder, filename, provider: requestedProvider, userId, origin } = data

  try {
    const { provider, resolvedName } = await getProvider(tenantId, requestedProvider)
    const result = await provider.uploadFromUrl(url, { url, folder, filename, tenantId })

    // URL uploads have no in-memory buffer at this layer, so scanning is always
    // performed asynchronously (the sync-mode setting does not apply here).
    const scanCfg = await getScanConfig(tenantId)
    const scanStatus: VirusScanStatus = scanCfg.enabled ? 'pending' : 'skipped'

    const uploadResult: UploadResult = { ...result, provider: resolvedName }
    const uploadedFileId = await persistUploadAudit(
      tenantId, userId, uploadResult, 'application/octet-stream', scanStatus, origin,
    )

    if (scanCfg.enabled && uploadedFileId) {
      await enqueueVirusScan(uploadedFileId, result.key, tenantId).catch((e) =>
        Logger.warn(`enqueue virus scan failed: ${e instanceof Error ? e.message : String(e)}`),
      )
    }

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
