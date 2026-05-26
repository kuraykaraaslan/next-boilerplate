import { z } from 'zod'
import { BlockDataSchema, PageMetadataSchema, CURRENT_SCHEMA_VERSION } from './dynamic_page.types'

export const CreatePageDTO = z.object({
  slug: z.string().max(200).regex(/^[a-z0-9-]*$/, 'Slug can only contain lowercase letters, numbers, and hyphens').default(''),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  sections: z.array(BlockDataSchema).default([]),
  metadata: PageMetadataSchema,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  schemaVersion: z.number().int().min(1).default(CURRENT_SCHEMA_VERSION),
})
export type CreatePageDTO = z.infer<typeof CreatePageDTO>

export const UpdatePageDTO = CreatePageDTO.partial()
export type UpdatePageDTO = z.infer<typeof UpdatePageDTO>

export const UpsertTranslationDTO = z.object({
  lang: z.string().min(2).max(10),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  sections: z.array(BlockDataSchema).default([]),
})
export type UpsertTranslationDTO = z.infer<typeof UpsertTranslationDTO>

export const CreateBlockDTO = z.object({
  type: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Type can only contain letters, numbers, underscores, and hyphens'),
  label: z.string().min(1).max(200),
  category: z.string().min(1).max(100).default('General'),
  description: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).default({}),
  defaultProps: z.record(z.string(), z.unknown()).default({}),
  template: z.string().default(''),
  script: z.string().optional(),
  isSystem: z.boolean().default(false),
})
export type CreateBlockDTO = z.infer<typeof CreateBlockDTO>

export const UpdateBlockDTO = CreateBlockDTO.partial()
export type UpdateBlockDTO = z.infer<typeof UpdateBlockDTO>
