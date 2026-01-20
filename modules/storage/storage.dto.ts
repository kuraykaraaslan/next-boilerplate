import { StorageProviderType } from './storage.enums'

export interface UploadFileDTO {
  file: File
  folder?: string
  filename?: string
  provider?: StorageProviderType
}

export interface UploadFromUrlDTO {
  url: string
  folder?: string
  filename?: string
  provider?: StorageProviderType
}

export interface DeleteFileDTO {
  key: string
  provider?: StorageProviderType
}

export interface GetFileUrlDTO {
  key: string
  provider?: StorageProviderType
}
