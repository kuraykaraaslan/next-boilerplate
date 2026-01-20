export interface UploadOptions {
  folder?: string
  filename?: string
  contentType?: string
}

export interface UploadFromUrlOptions extends UploadOptions {
  url: string
}

export interface UploadResult {
  url: string
  key: string
  bucket: string
  size?: number
}

export default abstract class BaseStorageProvider {
  abstract uploadFile(file: File, options?: UploadOptions): Promise<UploadResult>
  abstract uploadFromUrl(url: string, options?: UploadFromUrlOptions): Promise<UploadResult>
  abstract deleteFile(key: string): Promise<void>
  abstract getFileUrl(key: string): string
}
