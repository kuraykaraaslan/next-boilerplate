import Logger from '@/libs/logger'
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

export default class StorageService {

  /**
   * Read storage settings from SettingService and build S3Config
   */
  private static async getStorageSettings(): Promise<{ providerName: StorageProviderType; config: S3Config }> {
    const settings = await SettingService.getByKeys([...STORAGE_KEYS])

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
   * Get a configured provider instance
   */
  private static async getProvider(providerName?: StorageProviderType): Promise<{ provider: BaseStorageProvider; resolvedName: StorageProviderType }> {
    const { providerName: defaultName, config } = await StorageService.getStorageSettings()
    const resolvedName = providerName || defaultName
    const provider = StorageService.createProvider(resolvedName, config)
    return { provider, resolvedName }
  }

  /**
   * Upload a file to storage
   */
  static async uploadFile(data: UploadFileDTO): Promise<UploadResult> {
    const { file, folder, filename, provider: requestedProvider, tenantId = 'system' } = data

    try {
      const { provider, resolvedName } = await StorageService.getProvider(requestedProvider)
      const result = await provider.uploadFile(file, { folder, filename, tenantId })

      return {
        ...result,
        provider: resolvedName,
      }
    } catch (error) {
      Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Upload a file from URL to storage
   */
  static async uploadFromUrl(data: UploadFromUrlDTO): Promise<UploadResult> {
    const { url, folder, filename, provider: requestedProvider, tenantId = 'system' } = data

    try {
      const { provider, resolvedName } = await StorageService.getProvider(requestedProvider)
      const result = await provider.uploadFromUrl(url, { url, folder, filename, tenantId })

      return {
        ...result,
        provider: resolvedName,
      }
    } catch (error) {
      Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(data: DeleteFileDTO): Promise<void> {
    const { key, provider: requestedProvider } = data

    try {
      const { provider } = await StorageService.getProvider(requestedProvider)
      await provider.deleteFile(key)
    } catch (error) {
      Logger.error(`${STORAGE_MESSAGES.DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Get file URL from storage
   */
  static async getFileUrl(data: GetFileUrlDTO): Promise<string> {
    const { key, provider: requestedProvider } = data

    try {
      const { provider } = await StorageService.getProvider(requestedProvider)
      return provider.getFileUrl(key)
    } catch (error) {
      Logger.error(`Failed to get file URL: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
}
