import { UploadFileDTO, UploadFromUrlDTO, DeleteFileDTO, GetFileUrlDTO } from './storage.dto'
import { UploadResult } from './storage.types'
import {
  uploadFile, uploadFromUrl, deleteFile, getFileUrl,
  getPresignedUrl, uploadServerBuffer, hardDeleteFile,
} from './storage.operations'

/**
 * Storage service facade. The implementation is split across focused modules
 * (`storage.provider-factory`, `storage.audit`, `storage.operations`); this
 * class preserves the single `StorageService.*` entry point its callers depend on.
 */
export default class StorageService {
  static uploadFile(tenantId: string, data: UploadFileDTO): Promise<UploadResult> {
    return uploadFile(tenantId, data)
  }

  static uploadFromUrl(tenantId: string, data: UploadFromUrlDTO): Promise<UploadResult> {
    return uploadFromUrl(tenantId, data)
  }

  static deleteFile(tenantId: string, data: DeleteFileDTO): Promise<void> {
    return deleteFile(tenantId, data)
  }

  static getFileUrl(tenantId: string, data: GetFileUrlDTO): Promise<string> {
    return getFileUrl(tenantId, data)
  }

  static getPresignedUrl(tenantId: string, key: string, expiresSeconds = 900): Promise<string> {
    return getPresignedUrl(tenantId, key, expiresSeconds)
  }

  static uploadServerBuffer(
    tenantId: string,
    data: { buffer: Buffer; filename: string; contentType?: string; folder?: string },
  ): Promise<UploadResult> {
    return uploadServerBuffer(tenantId, data)
  }

  static hardDeleteFile(tenantId: string, data: DeleteFileDTO): Promise<void> {
    return hardDeleteFile(tenantId, data)
  }
}
