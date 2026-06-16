import Logger from '@nb/logger'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { extensionRegistry } from '@nb/common/server/extension-registry'
import { getEnabledModuleIds } from '@nb/setting/server/module-activation.service.next'
import type BaseStorageProvider from './providers/base.provider'
import type { StorageProviderContribution } from './storage.provider.types'
import { StorageProviderType } from './storage.enums'
import { S3Config } from './storage.types'
import { STORAGE_MESSAGES } from './storage.messages'
import SettingService from '@nb/setting/server/setting.service'
import { STORAGE_KEYS } from './storage.setting.keys'
import { expandMimeGroups } from './storage.mime-groups'
import type { UploadValidationPolicy } from './storage.validation'

/** Extension point satellite storage-provider modules contribute into. */
const STORAGE_PROVIDER_POINT = 'storage:provider'

/**
 * Read storage settings from SettingService and build S3Config for a tenant.
 * Each tenant has its own S3 bucket / credentials in Setting rows.
 */
export async function getStorageSettings(tenantId: string): Promise<{ providerName: StorageProviderType; config: S3Config }> {
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

/** Resolve the per-tenant upload validation policy from settings. */
export async function getValidationPolicy(tenantId: string): Promise<UploadValidationPolicy> {
  const s = await SettingService.getByKeys(tenantId, ['maxFileSizeMb', 'allowedExtensions', 'allowedMimeGroups', 'allowedMimeTypes', 'imageStripExif']).catch(() => ({} as Record<string, string>))
  const maxMb = parseInt(s.maxFileSizeMb ?? '', 10)

  // Effective MIME allowlist = selected groups (expanded) ∪ explicit MIME types.
  // Both empty → unrestricted (the provider-level type checks still apply).
  const groups = (s.allowedMimeGroups ?? '').split(',').map((g) => g.trim().toLowerCase()).filter(Boolean)
  const explicit = (s.allowedMimeTypes ?? '').split(',').map((m) => m.trim().toLowerCase()).filter(Boolean)
  const allowedMimeTypes = [...new Set([...expandMimeGroups(groups), ...explicit])]

  return {
    maxBytes: Number.isFinite(maxMb) && maxMb > 0 ? maxMb * 1024 * 1024 : 0,
    allowedExtensions: (s.allowedExtensions ?? '').split(',').map((e) => e.trim().toLowerCase().replace(/^\./, '')).filter(Boolean),
    allowedMimeTypes,
    stripExif: s.imageStripExif !== 'false', // strip by default (privacy)
  }
}

/**
 * Create a provider instance from config, discovered through the extension
 * registry (point `storage:provider`) and gated by the tenant's enabled-module
 * set — so a disabled provider module (e.g. `storage_minio`) is rejected here.
 */
export async function createProvider(
  tenantId: string,
  providerName: StorageProviderType,
  config: S3Config,
): Promise<BaseStorageProvider> {
  const enabledIds = await getEnabledModuleIds(tenantId)
  const contrib = extensionRegistry
    .getContributions(STORAGE_PROVIDER_POINT, { enabledIds })
    .find((c) => (c.key ?? c.metadata?.key) === providerName)
  if (!contrib) {
    Logger.error(`${STORAGE_MESSAGES.PROVIDER_NOT_FOUND}: ${providerName}`)
    throw new AppError(`${STORAGE_MESSAGES.PROVIDER_NOT_FOUND}: ${providerName}`, 400, ErrorCode.VALIDATION_ERROR)
  }
  const impl = await extensionRegistry.load<StorageProviderContribution>(contrib)
  return impl.create(config)
}

/** Get a configured provider instance for a tenant. */
export async function getProvider(
  tenantId: string,
  providerName?: StorageProviderType,
): Promise<{ provider: BaseStorageProvider; resolvedName: StorageProviderType }> {
  const { providerName: defaultName, config } = await getStorageSettings(tenantId)
  const resolvedName = providerName || defaultName
  const provider = await createProvider(tenantId, resolvedName, config)
  return { provider, resolvedName }
}
