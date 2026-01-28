import { z } from 'zod'
import { StorageProviderTypeSchema } from './storage.enums'

export const UploadOptionsSchema = z.object({
  folder: z.string().optional(),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  tenantId: z.string().optional(),
})
export type UploadOptions = z.infer<typeof UploadOptionsSchema>

export const UploadFromUrlOptionsSchema = UploadOptionsSchema.extend({
  url: z.string(),
})
export type UploadFromUrlOptions = z.infer<typeof UploadFromUrlOptionsSchema>

export const ProviderUploadResultSchema = z.object({
  url: z.string(),
  key: z.string(),
  bucket: z.string(),
  size: z.number().optional(),
})
export type ProviderUploadResult = z.infer<typeof ProviderUploadResultSchema>

export const UploadResultSchema = ProviderUploadResultSchema.extend({
  provider: StorageProviderTypeSchema,
})
export type UploadResult = z.infer<typeof UploadResultSchema>

export const S3ConfigSchema = z.object({
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  endpoint: z.string().optional(),
})
export type S3Config = z.infer<typeof S3ConfigSchema>
