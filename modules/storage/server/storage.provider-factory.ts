import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { listExternalContributions } from '@kuraykaraaslan/common/server/external-extensions'
import type BaseStorageProvider from './providers/base.provider'
import { IsolatedStorageProvider, type ResolvedStorageConfig } from './providers/isolated.provider'
import { StorageProviderType } from './storage.enums'
import { S3Config } from './storage.types'
import { STORAGE_MESSAGES } from './storage.messages'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
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
 * Resolve a storage provider for a tenant. Backends are SANDBOXED community plugins
 * (the @storage/* family) resolved per-tenant via the external-contributions bridge —
 * no in-tree built-in fallback. The plugin's non-secret config (bucket/region/
 * endpoint) is fetched once via its `getConfig` op so the facade can build URLs
 * synchronously; the SigV4-signed PutObject/DeleteObject egress runs in the isolate.
 */
export async function getProvider(
  tenantId: string,
  providerName?: StorageProviderType,
): Promise<{ provider: BaseStorageProvider; resolvedName: StorageProviderType }> {
  const exts = await listExternalContributions(tenantId, STORAGE_PROVIDER_POINT)
  if (exts.length === 0) {
    throw new AppError(STORAGE_MESSAGES.PROVIDER_NOT_FOUND, 400, ErrorCode.VALIDATION_ERROR)
  }
  // `getStorageSettings` reads the tenant's storage settings (also used by the scan
  // path) — it throws if settings are unavailable, which must fail the upload.
  const { providerName: defaultName } = await getStorageSettings(tenantId)
  const wanted = providerName || defaultName
  // Strict: storage must NOT silently switch backends (it would write to the wrong
  // bucket), so an unknown/not-installed provider is an error, not a fallback.
  const ext = exts.find((c) => c.key === wanted)
  if (!ext) {
    throw new AppError(`${STORAGE_MESSAGES.PROVIDER_NOT_FOUND}: ${wanted}`, 400, ErrorCode.VALIDATION_ERROR)
  }
  const cfg = (await ext.invoke('getConfig', {})) as ResolvedStorageConfig
  return { provider: new IsolatedStorageProvider(ext.invoke, cfg), resolvedName: ext.key as StorageProviderType }
}
