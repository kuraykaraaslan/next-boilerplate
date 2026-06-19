import { v4 as uuidv4 } from 'uuid'
import BaseStorageProvider from './base.provider'
import type { UploadOptions, UploadFromUrlOptions, ProviderUploadResult, S3Config } from '../storage.types'
import { StorageExtensionSchema, StorageMimeTypeSchema } from '../storage.enums'
import { isValidStorageFolder } from '../storage.folders'

type Invoke = (op: string, input: unknown) => Promise<unknown>

/** Non-secret storage config resolved from the plugin (via the getConfig op). */
export interface ResolvedStorageConfig {
  bucket: string
  region: string
  endpoint?: string
}

/**
 * Host-facing facade that runs a storage backend as a SANDBOXED community plugin.
 * File validation, key generation, the synchronous `getFileUrl`, and the
 * `uploadFromUrl` source fetch all run HOST-SIDE (the isolate can't do a sync URL
 * build, and an arbitrary source host can't be allowlisted). Only the SigV4-signed
 * PutObject/DeleteObject egress runs in the isolate; the secret access key stays
 * host-side (used in the SigV4 HMAC chain). File bytes cross the boundary as base64
 * (bounded by the isolate memory limit).
 */
export class IsolatedStorageProvider extends BaseStorageProvider {
  private readonly invoke: Invoke
  private readonly cfg: ResolvedStorageConfig

  constructor(invoke: Invoke, cfg: ResolvedStorageConfig) {
    super({ bucket: cfg.bucket, region: cfg.region, accessKeyId: '(sandboxed)', secretAccessKey: '(sandboxed)', endpoint: cfg.endpoint } as S3Config)
    this.invoke = invoke
    this.cfg = cfg
  }

  private validateFile(file: File, folder: string) {
    if (!file) throw new Error('No file provided')
    if (!isValidStorageFolder(folder)) throw new Error('INVALID_FOLDER_NAME')
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !StorageExtensionSchema.safeParse(extension).success) throw new Error(`Invalid file extension: .${extension}`)
    const mimeType = file.type
    if (!mimeType || !StorageMimeTypeSchema.safeParse(mimeType).success) throw new Error(`Invalid MIME type: ${mimeType}`)
  }

  private generateFileKey(tenantId: string, folder: string, filename: string, extension?: string): string {
    const timestamp = Date.now()
    const uuid = uuidv4().slice(0, 8)
    const ext = extension || filename.split('.').pop()?.toLowerCase() || ''
    const baseName = filename.split('.')[0] || 'file'
    return `${tenantId}/${folder}/${timestamp}-${uuid}-${baseName}.${ext}`
  }

  getFileUrl(key: string): string {
    const base = this.cfg.endpoint
      ? `${this.cfg.endpoint.replace(/\/$/, '')}/${this.cfg.bucket}`
      : `https://${this.cfg.bucket}.s3.${this.cfg.region}.amazonaws.com`
    return `${base}/${key}`
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<ProviderUploadResult> {
    const folder = options?.folder || 'general'
    const tenantId = options?.tenantId || 'system'
    this.validateFile(file, folder)
    const buf = Buffer.from(await file.arrayBuffer())
    const extension = file.name.split('.').pop()?.toLowerCase()
    const key = options?.filename
      ? `${tenantId}/${folder}/${options.filename}`
      : this.generateFileKey(tenantId, folder, file.name, extension)
    await this.invoke('putObject', { key, contentBase64: buf.toString('base64'), contentType: options?.contentType || file.type })
    return { url: this.getFileUrl(key), key, bucket: this.cfg.bucket, size: file.size }
  }

  async uploadFromUrl(url: string, options?: UploadFromUrlOptions): Promise<ProviderUploadResult> {
    const folder = options?.folder || 'general'
    const tenantId = options?.tenantId || 'system'
    if (!isValidStorageFolder(folder)) throw new Error('INVALID_FOLDER_NAME')
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch file from URL: ${response.statusText}`)
    const mimeType = response.headers.get('content-type') || 'application/octet-stream'
    if (!StorageMimeTypeSchema.safeParse(mimeType).success) throw new Error(`Invalid MIME type from URL: ${mimeType}`)
    const buf = Buffer.from(await response.arrayBuffer())
    const filename = options?.filename || url.split('?')[0].split('/').pop() || 'file'
    const key = options?.filename
      ? `${tenantId}/${folder}/${options.filename}`
      : this.generateFileKey(tenantId, folder, filename)
    await this.invoke('putObject', { key, contentBase64: buf.toString('base64'), contentType: options?.contentType || mimeType })
    return { url: this.getFileUrl(key), key, bucket: this.cfg.bucket, size: buf.byteLength }
  }

  async deleteFile(key: string): Promise<void> {
    await this.invoke('deleteObject', { key })
  }
}
