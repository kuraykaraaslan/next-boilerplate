import { z } from 'zod'

export const StorageProviderTypeSchema = z.enum(['aws-s3', 's3', 'cloudflare-r2', 'digitalocean-spaces', 'minio'])
export type StorageProviderType = z.infer<typeof StorageProviderTypeSchema>

export const StorageFolderSchema = z.enum([
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
  'branding/logos',
  'branding/favicon',
  'branding/wallpapers',
])
export type StorageFolder = z.infer<typeof StorageFolderSchema>

export const StorageExtensionSchema = z.enum(['jpeg', 'jpg', 'png', 'webp', 'avif','ico'])
export type StorageExtension = z.infer<typeof StorageExtensionSchema>

export const StorageMimeTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
export type StorageMimeType = z.infer<typeof StorageMimeTypeSchema>
