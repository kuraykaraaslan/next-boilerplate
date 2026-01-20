export interface UploadResult {
  url: string
  key: string
  bucket: string
  size?: number
  provider: string
}

export interface StorageConfig {
  defaultProvider: string
  allowedFolders: string[]
  allowedExtensions: string[]
  allowedMimeTypes: string[]
}
