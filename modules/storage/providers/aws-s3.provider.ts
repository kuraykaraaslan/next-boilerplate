import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import BaseStorageProvider from './base.provider'
import type { UploadOptions, UploadFromUrlOptions, ProviderUploadResult, S3Config } from '../storage.types'
import Logger from '@/libs/logger'
import { v4 as uuidv4 } from 'uuid'
import { StorageFolderSchema, StorageExtensionSchema, StorageMimeTypeSchema } from '../storage.enums'

export default class AWSS3Provider extends BaseStorageProvider {
  private s3Client: S3Client

  constructor(config: S3Config) {
    super(config)
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  /** Validate MIME type and extension consistency */
  private validateFile(file: File, folder: string) {
    if (!file) throw new Error('No file provided')
    if (!StorageFolderSchema.safeParse(folder).success) {
      throw new Error('INVALID_FOLDER_NAME')
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !StorageExtensionSchema.safeParse(extension).success) {
      throw new Error(`Invalid file extension: .${extension}`)
    }

    const mimeType = file.type
    if (!mimeType || !StorageMimeTypeSchema.safeParse(mimeType).success) {
      throw new Error(`Invalid MIME type: ${mimeType}`)
    }
  }

  /** Validate folder name */
  private validateFolder(folder: string) {
    if (!StorageFolderSchema.safeParse(folder).success) {
      throw new Error('INVALID_FOLDER_NAME')
    }
  }

  /** Generate unique file key */
  private generateFileKey(tenantId: string, folder: string, filename: string, extension?: string): string {
    const timestamp = Date.now()
    const uuid = uuidv4().slice(0, 8)
    const ext = extension || filename.split('.').pop()?.toLowerCase() || ''
    const baseName = filename.split('.')[0] || 'file'
    return `${tenantId}/${folder}/${timestamp}-${uuid}-${baseName}.${ext}`
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<ProviderUploadResult> {
    const folder = options?.folder || 'general'
    const tenantId = options?.tenantId || 'system'
    this.validateFile(file, folder)

    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      const extension = file.name.split('.').pop()?.toLowerCase()
      const fileKey = options?.filename
        ? `${tenantId}/${folder}/${options.filename}`
        : this.generateFileKey(tenantId, folder, file.name, extension)

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: options?.contentType || file.type,
      })

      await this.s3Client.send(command)

      const url = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${fileKey}`

      Logger.info(`File uploaded successfully to AWS S3: ${fileKey}`)

      return {
        url,
        key: fileKey,
        bucket: this.config.bucket,
        size: file.size,
      }
    } catch (error) {
      Logger.error(`Failed to upload file to AWS S3: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to upload file to AWS S3')
    }
  }

  async uploadFromUrl(url: string, options?: UploadFromUrlOptions): Promise<ProviderUploadResult> {
    const folder = options?.folder || 'general'
    const tenantId = options?.tenantId || 'system'
    this.validateFolder(folder)

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`)
      }

      const mimeType = response.headers.get('content-type') || 'application/octet-stream'

      if (!StorageMimeTypeSchema.safeParse(mimeType).success) {
        throw new Error(`Invalid MIME type from URL: ${mimeType}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)

      const filename = options?.filename || url.split('?')[0].split('/').pop() || 'file'
      const fileKey = options?.filename
        ? `${tenantId}/${folder}/${options.filename}`
        : this.generateFileKey(tenantId, folder, filename)

      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: options?.contentType || mimeType,
      })

      await this.s3Client.send(command)

      const fileUrl = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${fileKey}`

      Logger.info(`File uploaded from URL successfully to AWS S3: ${fileKey}`)

      return {
        url: fileUrl,
        key: fileKey,
        bucket: this.config.bucket,
        size: arrayBuffer.byteLength,
      }
    } catch (error) {
      Logger.error(`Failed to upload file from URL to AWS S3: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to upload file from URL to AWS S3')
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      })

      await this.s3Client.send(command)
      Logger.info(`File deleted successfully from AWS S3: ${key}`)
    } catch (error) {
      Logger.error(`Failed to delete file from AWS S3: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to delete file from AWS S3')
    }
  }

  getFileUrl(key: string): string {
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`
  }
}
