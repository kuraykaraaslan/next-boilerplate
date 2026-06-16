import type { UploadOptions, UploadFromUrlOptions, ProviderUploadResult, S3Config } from '../storage.types'

export default abstract class BaseStorageProvider {
  protected config: S3Config

  constructor(config: S3Config) {
    this.config = config
  }

  abstract uploadFile(file: File, options?: UploadOptions): Promise<ProviderUploadResult>
  abstract uploadFromUrl(url: string, options?: UploadFromUrlOptions): Promise<ProviderUploadResult>
  abstract deleteFile(key: string): Promise<void>
  abstract getFileUrl(key: string): string
}
