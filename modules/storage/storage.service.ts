import Logger from '@/libs/logger'
import BaseStorageProvider from './providers/base.provider'
import AWSS3Provider from './providers/aws-s3.provider'
import CloudflareR2Provider from './providers/cloudflare-r2.provider'
import DigitalOceanSpacesProvider from './providers/digitalocean-spaces.provider'
import MinIOProvider from './providers/minio.provider'
import { StorageProviderType } from './storage.enums'
import { UploadFileDTO, UploadFromUrlDTO, DeleteFileDTO, GetFileUrlDTO } from './storage.dto'
import { UploadResult } from './storage.types'
import { STORAGE_MESSAGES } from './storage.messages'

export default class StorageService {
  // Provider instances
  private static readonly awsS3Provider = new AWSS3Provider()
  private static readonly cloudflareR2Provider = new CloudflareR2Provider()
  private static readonly digitalOceanSpacesProvider = new DigitalOceanSpacesProvider()
  private static readonly minioProvider = new MinIOProvider()

  // Provider name to instance mapping
  private static readonly PROVIDERS = new Map<StorageProviderType, BaseStorageProvider>([
    ['aws-s3', StorageService.awsS3Provider],
    ['cloudflare-r2', StorageService.cloudflareR2Provider],
    ['digitalocean-spaces', StorageService.digitalOceanSpacesProvider],
    ['minio', StorageService.minioProvider],
  ])

  // Default provider from env or fallback to aws-s3
  private static readonly DEFAULT_PROVIDER_NAME: StorageProviderType =
    (process.env.STORAGE_DEFAULT_PROVIDER as StorageProviderType) || 'aws-s3'

  /**
   * Get a specific provider instance
   */
  private static getProvider(providerName?: StorageProviderType): BaseStorageProvider {
    const name = providerName || StorageService.DEFAULT_PROVIDER_NAME
    const provider = StorageService.PROVIDERS.get(name)

    if (!provider) {
      Logger.error(`${STORAGE_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`)
      throw new Error(`${STORAGE_MESSAGES.PROVIDER_NOT_FOUND}: ${name}`)
    }

    return provider
  }

  /**
   * Upload a file to storage
   * @param data - Upload file data
   * @returns Upload result with URL and metadata
   */
  static async uploadFile(data: UploadFileDTO): Promise<UploadResult> {
    const { file, folder, filename, provider } = data

    try {
      const storageProvider = StorageService.getProvider(provider)
      const result = await storageProvider.uploadFile(file, { folder, filename })

      return {
        ...result,
        provider: provider || StorageService.DEFAULT_PROVIDER_NAME,
      }
    } catch (error) {
      Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Upload a file from URL to storage
   * @param data - Upload from URL data
   * @returns Upload result with URL and metadata
   */
  static async uploadFromUrl(data: UploadFromUrlDTO): Promise<UploadResult> {
    const { url, folder, filename, provider } = data

    try {
      const storageProvider = StorageService.getProvider(provider)
      const result = await storageProvider.uploadFromUrl(url, { url, folder, filename })

      return {
        ...result,
        provider: provider || StorageService.DEFAULT_PROVIDER_NAME,
      }
    } catch (error) {
      Logger.error(`${STORAGE_MESSAGES.UPLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Delete a file from storage
   * @param data - Delete file data
   */
  static async deleteFile(data: DeleteFileDTO): Promise<void> {
    const { key, provider } = data

    try {
      const storageProvider = StorageService.getProvider(provider)
      await storageProvider.deleteFile(key)
    } catch (error) {
      Logger.error(`${STORAGE_MESSAGES.DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Get file URL from storage
   * @param data - Get file URL data
   * @returns File URL
   */
  static getFileUrl(data: GetFileUrlDTO): string {
    const { key, provider } = data

    try {
      const storageProvider = StorageService.getProvider(provider)
      return storageProvider.getFileUrl(key)
    } catch (error) {
      Logger.error(`Failed to get file URL: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): StorageProviderType[] {
    return Array.from(StorageService.PROVIDERS.keys())
  }

  /**
   * Get default provider name
   */
  static getDefaultProvider(): StorageProviderType {
    return StorageService.DEFAULT_PROVIDER_NAME
  }
}
