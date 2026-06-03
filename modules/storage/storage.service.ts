import Logger from '@/modules/logger'
import BaseStorageProvider from './providers/base.provider'
import AWSS3Provider from './providers/aws-s3.provider'
import CloudflareR2Provider from './providers/cloudflare-r2.provider'
import DigitalOceanSpacesProvider from './providers/digitalocean-spaces.provider'
import MinIOProvider from './providers/minio.provider'
import { StorageProviderType } from './storage.enums'
import { UploadFileDTO, UploadFromUrlDTO, DeleteFileDTO, GetFileUrlDTO } from './storage.dto'
import { UploadResult, S3Config } from './storage.types'
import { STORAGE_MESSAGES } from './storage.messages'
import SettingService from '@/modules/setting/setting.service'
import { STORAGE_KEYS } from './storage.setting.keys'
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service'
import { tenantDataSourceFor } from '@/modules/db'
import { UploadedFile } from './entities/uploaded_file.entity'
import { IsNull } from 'typeorm'
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service'
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys'
import { isRootTenant } from '@/modules/tenant/tenant.constants'

export default class StorageService {

  /**
   * Read storage settings from SettingService and build S3Config for a tenant.
   * Each tenant has its own S3 bucket / credentials in Setting rows.
   */
  private static async getStorageSettings(tenantId: string): Promise<{ providerName: StorageProviderType; config: S3Config }> {
    const settings = await SettingService.getByKeys(tenantId, [...STORAGE_KEYS])

    const providerName = (settings.storageProvider || 'aws-s3') as StorageProviderType

    const config: S3Config = {
      bucket: settings.s3Bucket || '',
      region: settings.s3Region || 'us-east-1',
      accessKeyId: settings.s3AccessKey || '',
      secretAccessKey: settings.s3SecretKey || '',
      endpoint: settings.s3Endpoint || undefined,
    }

    return { providerName, config }
  }

  /**
   * Create a provider instance from config
   */
  private static createProvider(providerName: StorageProviderType, config: S3Config): BaseStorageProvider {
    switch (providerName) {
      case 'aws-s3':
        return new AWSS3Provider(config)
      case 'cloudflare-r2':
        return new CloudflareR2Provider(config)
      case 'digitalocean-spaces':
        return new DigitalOceanSpacesProvider(config)
      case 'minio':
        return new MinIOProvider(config)
      default:
        Logger.error(`${STORAGE_MESSAGES.PROVIDER_NOT_FOUND}: ${providerName}`)
        throw new Error(`${STORAGE_MESSAGES.PROVIDER_NOT_FOUND}: ${providerName}`)
    }
  }

  /**
   * Get a configured provider instance for a tenant
   */
  private static async getProvider(
    tenantId: string,
    providerName?: StorageProviderType
  ): Promise<{ provider: BaseStorageProvider; resolvedName: StorageProviderType }> {
    const { providerName: defaultName, config } = await StorageService.getStorageSettings(tenantId)
    const resolvedName = providerName || defaultName
    const provider = StorageService.createProvider(resolvedName, config)
    return { provider, resolvedName }
  }

  /**
   * Persist an UploadedFile audit row + increment the tenant_usage.storageBytes
   * counter. Best-effort: failures are logged but do not fail the upload —
   * the file is already in the bucket at this point.
   */
  private static async persistUploadAudit(
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
    } catch (error) {
      Logger.warn(
        `StorageService.persistUploadAudit failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (size > 0) {
      await TenantUsageService.incrementStorageBytes(tenantId, size)
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
  private static async assertStorageFeatureAccess(tenantId: string): Promise<void> {
    if (isRootTenant(tenantId)) return

    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_STORAGE_UPLOAD)

    const usage = await TenantUsageService.getUsage(tenantId)
    await TenantFeatureGateService.assertFeatureAccess(
      tenantId,
      FEATURE_KEYS.FEATURE_STORAGE_QUOTA_BYTES,
      usage.storageBytes,
    )
  }

  /**
   * Upload a file to storage for a tenant
   */
  static async uploadFile(tenantId: string, data: UploadFileDTO): Promise<UploadResult> {
    await StorageService.assertStorageFeatureAccess(tenantId)

    const { file, folder, filename, provider: requestedProvider } = data
    const effectiveTenantId = data.tenantId || tenantId

    try {
      const { provider, resolvedName } = await StorageService.getProvider(tenantId, requestedProvider)
      const result = await provider.uploadFile(file, { folder, filename, tenantId: effectiveTenantId })

      const uploadResult: UploadResult = {
        ...result,
        provider: resolvedName,
      }

      const uploadedFileId = await StorageService.persistUploadAudit(tenantId, undefined, uploadResult, file.type)

      return { ...uploadResult, uploadedFileId }
    } catch (error) {
      Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Upload a file from URL to storage for a tenant
   */
  static async uploadFromUrl(tenantId: string, data: UploadFromUrlDTO): Promise<UploadResult> {
    await StorageService.assertStorageFeatureAccess(tenantId)

    const { url, folder, filename, provider: requestedProvider } = data
    const effectiveTenantId = data.tenantId || tenantId

    try {
      const { provider, resolvedName } = await StorageService.getProvider(tenantId, requestedProvider)
      const result = await provider.uploadFromUrl(url, { url, folder, filename, tenantId: effectiveTenantId })

      const uploadResult: UploadResult = {
        ...result,
        provider: resolvedName,
      }

      const uploadedFileId = await StorageService.persistUploadAudit(tenantId, undefined, uploadResult, 'application/octet-stream')

      return { ...uploadResult, uploadedFileId }
    } catch (error) {
      Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Delete a file from a tenant's storage.
   * Soft-deletes the matching UploadedFile audit row so we keep an immutable
   * record of what existed. Storage byte counter is increment-only (audit
   * friendly); a future decrement pass can be added in tenant_usage.
   */
  static async deleteFile(tenantId: string, data: DeleteFileDTO): Promise<void> {
    const { key, provider: requestedProvider } = data

    try {
      const { provider } = await StorageService.getProvider(tenantId, requestedProvider)
      await provider.deleteFile(key)

      try {
        const ds = await tenantDataSourceFor(tenantId)
        const repo = ds.getRepository(UploadedFile)
        const row = await repo.findOne({ where: { tenantId, key, deletedAt: IsNull() } })
        if (row) await repo.softRemove(row)
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

  /**
   * Get file URL from a tenant's storage
   */
  static async getFileUrl(tenantId: string, data: GetFileUrlDTO): Promise<string> {
    const { key, provider: requestedProvider } = data

    try {
      const { provider } = await StorageService.getProvider(tenantId, requestedProvider)
      return provider.getFileUrl(key)
    } catch (error) {
      Logger.error(`Failed to get file URL: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
}
