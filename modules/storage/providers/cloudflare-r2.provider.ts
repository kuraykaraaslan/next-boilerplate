import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import BaseStorageProvider, { UploadOptions, UploadFromUrlOptions, UploadResult } from './base.provider'
import Logger from '@/libs/logger'
import { v4 as uuidv4 } from 'uuid'

export default class CloudflareR2Provider extends BaseStorageProvider {
  private static readonly BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!
  private static readonly ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID!
  private static readonly ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!
  private static readonly SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
  private static readonly PUBLIC_DOMAIN = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN // Optional custom domain

  private static readonly s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${CloudflareR2Provider.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: CloudflareR2Provider.ACCESS_KEY_ID,
      secretAccessKey: CloudflareR2Provider.SECRET_ACCESS_KEY,
    },
  })

  static allowedFolders = [
    'general',
    'categories',
    'users',
    'posts',
    'projects',
    'comments',
    'images',
    'videos',
    'audios',
    'files',
    'content',
  ]

  static allowedExtensions = ['jpeg', 'jpg', 'png', 'webp', 'avif']
  static allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
  ]

  /** Validate MIME type and extension consistency */
  private validateFile(file: File, folder: string) {
    if (!file) throw new Error('No file provided')
    if (!CloudflareR2Provider.allowedFolders.includes(folder)) {
      throw new Error('INVALID_FOLDER_NAME')
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !CloudflareR2Provider.allowedExtensions.includes(extension)) {
      throw new Error(`Invalid file extension: .${extension}`)
    }

    const mimeType = file.type
    if (!mimeType || !CloudflareR2Provider.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid MIME type: ${mimeType}`)
    }
  }

  /** Validate folder name */
  private validateFolder(folder: string) {
    if (!CloudflareR2Provider.allowedFolders.includes(folder)) {
      throw new Error('INVALID_FOLDER_NAME')
    }
  }

  /** Generate unique file key */
  private generateFileKey(folder: string, filename: string, extension?: string): string {
    const timestamp = Date.now()
    const uuid = uuidv4().slice(0, 8)
    const ext = extension || filename.split('.').pop()?.toLowerCase() || ''
    const baseName = filename.split('.')[0] || 'file'
    return `${folder}/${timestamp}-${uuid}-${baseName}.${ext}`
  }

  /** Get public URL for file */
  private getPublicUrl(fileKey: string): string {
    if (CloudflareR2Provider.PUBLIC_DOMAIN) {
      return `https://${CloudflareR2Provider.PUBLIC_DOMAIN}/${fileKey}`
    }
    return `https://${CloudflareR2Provider.BUCKET_NAME}.${CloudflareR2Provider.ACCOUNT_ID}.r2.cloudflarestorage.com/${fileKey}`
  }

  async uploadFile(file: File, options?: UploadOptions): Promise<UploadResult> {
    const folder = options?.folder || 'general'
    this.validateFile(file, folder)

    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      const extension = file.name.split('.').pop()?.toLowerCase()
      const fileKey = options?.filename 
        ? `${folder}/${options.filename}`
        : this.generateFileKey(folder, file.name, extension)

      const command = new PutObjectCommand({
        Bucket: CloudflareR2Provider.BUCKET_NAME,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: options?.contentType || file.type,
      })

      await CloudflareR2Provider.s3Client.send(command)

      const url = this.getPublicUrl(fileKey)

      Logger.info(`File uploaded successfully to Cloudflare R2: ${fileKey}`)

      return {
        url,
        key: fileKey,
        bucket: CloudflareR2Provider.BUCKET_NAME,
        size: file.size,
      }
    } catch (error) {
      Logger.error(`Failed to upload file to Cloudflare R2: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to upload file to Cloudflare R2')
    }
  }

  async uploadFromUrl(url: string, options?: UploadFromUrlOptions): Promise<UploadResult> {
    const folder = options?.folder || 'general'
    this.validateFolder(folder)

    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`)
      }

      const mimeType = response.headers.get('content-type') || 'application/octet-stream'

      if (!CloudflareR2Provider.allowedMimeTypes.includes(mimeType)) {
        throw new Error(`Invalid MIME type from URL: ${mimeType}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)
      
      const filename = options?.filename || url.split('?')[0].split('/').pop() || 'file'
      const fileKey = options?.filename
        ? `${folder}/${options.filename}`
        : this.generateFileKey(folder, filename)

      const command = new PutObjectCommand({
        Bucket: CloudflareR2Provider.BUCKET_NAME,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: options?.contentType || mimeType,
      })

      await CloudflareR2Provider.s3Client.send(command)

      const fileUrl = this.getPublicUrl(fileKey)

      Logger.info(`File uploaded from URL successfully to Cloudflare R2: ${fileKey}`)

      return {
        url: fileUrl,
        key: fileKey,
        bucket: CloudflareR2Provider.BUCKET_NAME,
        size: arrayBuffer.byteLength,
      }
    } catch (error) {
      Logger.error(`Failed to upload file from URL to Cloudflare R2: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to upload file from URL to Cloudflare R2')
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: CloudflareR2Provider.BUCKET_NAME,
        Key: key,
      })

      await CloudflareR2Provider.s3Client.send(command)
      Logger.info(`File deleted successfully from Cloudflare R2: ${key}`)
    } catch (error) {
      Logger.error(`Failed to delete file from Cloudflare R2: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error('Failed to delete file from Cloudflare R2')
    }
  }

  getFileUrl(key: string): string {
    return this.getPublicUrl(key)
  }
}
