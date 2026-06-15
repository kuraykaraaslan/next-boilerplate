import { z } from 'zod'
import { StorageProviderTypeSchema } from './storage.enums'

// Origin of an upload, captured for fraud investigation / GDPR audit responses
// ("who uploaded this from where?"). The country is inferred server-side from
// the IP; callers only supply ip + userAgent.
export const UploadOriginSchema = z.object({
  ip: z.string().optional(),
  userAgent: z.string().optional(),
})
export type UploadOrigin = z.infer<typeof UploadOriginSchema>

export const UploadFileDTOSchema = z.object({
  file: z.instanceof(File),
  folder: z.string().optional(),
  filename: z.string().optional(),
  provider: StorageProviderTypeSchema.optional(),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  origin: UploadOriginSchema.optional(),
})
export type UploadFileDTO = z.infer<typeof UploadFileDTOSchema>

export const UploadFromUrlDTOSchema = z.object({
  url: z.string(),
  folder: z.string().optional(),
  filename: z.string().optional(),
  provider: StorageProviderTypeSchema.optional(),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  origin: UploadOriginSchema.optional(),
})
export type UploadFromUrlDTO = z.infer<typeof UploadFromUrlDTOSchema>

export const DeleteFileDTOSchema = z.object({
  key: z.string(),
  provider: StorageProviderTypeSchema.optional(),
  tenantId: z.string().optional(),
})
export type DeleteFileDTO = z.infer<typeof DeleteFileDTOSchema>

export const GetFileUrlDTOSchema = z.object({
  key: z.string(),
  provider: StorageProviderTypeSchema.optional(),
  tenantId: z.string().optional(),
})
export type GetFileUrlDTO = z.infer<typeof GetFileUrlDTOSchema>
