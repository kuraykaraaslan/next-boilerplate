import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import BaseStorageProvider from '@kuraykaraaslan/storage/server/providers/base.provider'
import type { UploadOptions, UploadFromUrlOptions, ProviderUploadResult, S3Config } from '@kuraykaraaslan/storage/server/storage.types'
import Logger from '@kuraykaraaslan/logger'
import { v4 as uuidv4 } from 'uuid'

/**
 * Local filesystem storage provider. Writes objects under a base directory on
 * disk (default `<cwd>/.local-storage`, override with `LOCAL_STORAGE_DIR`).
 *
 * Unlike the S3-family providers this does NOT enforce the image-only MIME /
 * extension validation: it is the on-disk twin of `uploadServerBuffer`'s
 * "bypass image validation" path, so it can hold arbitrary server artifacts
 * such as community plugin bundles (`.js`). Intended for development / offline
 * use — there is no signed-URL or CDN surface.
 */
export default class LocalStorageProvider extends BaseStorageProvider {
  private baseDir: string

  constructor(config: S3Config) {
    super(config)
    this.baseDir = path.resolve(process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), '.local-storage'))
  }

  /** Resolve a storage key to an absolute path, guarding against traversal outside baseDir. */
  private absPath(key: string): string {
    const abs = path.resolve(this.baseDir, key)
    if (abs !== this.baseDir && !abs.startsWith(this.baseDir + path.sep)) {
      throw new Error('INVALID_STORAGE_KEY')
    }
    return abs
  }

  /** `<tenantId>/<folder>/<filename>` — or a unique key when no filename is given. */
  private buildKey(tenantId: string, folder: string, filename?: string, originalName?: string): string {
    if (filename) return `${tenantId}/${folder}/${filename}`
    const ext = originalName?.split('.').pop()?.toLowerCase() || 'bin'
    const base = originalName?.split('.')[0] || 'file'
    return `${tenantId}/${folder}/${Date.now()}-${uuidv4().slice(0, 8)}-${base}.${ext}`
  }

  private async writeBuffer(key: string, buffer: Buffer): Promise<void> {
    const abs = this.absPath(key)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, buffer)
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<ProviderUploadResult> {
    const folder = options?.folder || 'general'
    const tenantId = options?.tenantId || 'system'
    if (!file) throw new Error('No file provided')

    const key = this.buildKey(tenantId, folder, options?.filename, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    await this.writeBuffer(key, buffer)
    Logger.info(`File written to local storage: ${key}`)

    return { url: this.getFileUrl(key), key, bucket: this.config.bucket || 'local', size: buffer.byteLength }
  }

  async uploadFromUrl(url: string, options?: UploadFromUrlOptions): Promise<ProviderUploadResult> {
    const folder = options?.folder || 'general'
    const tenantId = options?.tenantId || 'system'

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch file from URL: ${response.statusText}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const filename = options?.filename || url.split('?')[0].split('/').pop() || 'file'
    const key = this.buildKey(tenantId, folder, options?.filename, filename)
    await this.writeBuffer(key, buffer)
    Logger.info(`File written from URL to local storage: ${key}`)

    return { url: this.getFileUrl(key), key, bucket: this.config.bucket || 'local', size: buffer.byteLength }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await fs.unlink(this.absPath(key))
      Logger.info(`File deleted from local storage: ${key}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return
      Logger.error(`Failed to delete file from local storage: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to delete file from local storage')
    }
  }

  getFileUrl(key: string): string {
    return pathToFileURL(this.absPath(key)).href
  }
}
