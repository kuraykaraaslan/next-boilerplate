import { z } from 'zod'
import { BlockDataSchema, PageMetadataSchema, CollectionFieldSchema, CURRENT_SCHEMA_VERSION } from './dynamic_page.types'

export const CreatePageDTO = z.object({
  slug: z.string().max(200).regex(
    /^([a-z0-9_-]+(\/[a-z0-9_-]+)*)?$/,
    'Slug segments can only contain lowercase letters, numbers, underscores and hyphens; segments separated by single forward slashes (no leading/trailing slash).',
  ).default(''),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  sections: z.array(BlockDataSchema).default([]),
  metadata: PageMetadataSchema,
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  publishAt: z.coerce.date().nullable().optional(),
  expireAt: z.coerce.date().nullable().optional(),
  cacheTtlSeconds: z.number().int().nonnegative().nullable().optional(),
  audienceCountries: z.array(z.string()).nullable().optional(),
  audienceLanguages: z.array(z.string()).nullable().optional(),
  audienceRoles: z.array(z.string()).nullable().optional(),
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
  serverHandler: z.string().optional(),
  allowedCollections: z.array(z.string()).optional(),
  isSystem: z.boolean().default(false),
})
export type CreateBlockDTO = z.infer<typeof CreateBlockDTO>

export const UpdateBlockDTO = CreateBlockDTO.partial()
export type UpdateBlockDTO = z.infer<typeof UpdateBlockDTO>

// ─── Collection DTOs ──────────────────────────────────────────────────────────

export const CreateCollectionDTO = z.object({
  slug: z.string().min(1).max(100).regex(
    /^[a-z0-9_-]+$/,
    'Slug can only contain lowercase letters, numbers, underscores, and hyphens',
  ),
  label: z.string().min(1).max(200),
  description: z.string().optional(),
  fields: z.array(CollectionFieldSchema).default([]),
  isSystem: z.boolean().default(false),
})
export type CreateCollectionDTO = z.infer<typeof CreateCollectionDTO>

export const UpdateCollectionDTO = CreateCollectionDTO.partial()
export type UpdateCollectionDTO = z.infer<typeof UpdateCollectionDTO>

export const CreateCollectionItemDTO = z.object({
  data: z.record(z.string(), z.unknown()),
})
export type CreateCollectionItemDTO = z.infer<typeof CreateCollectionItemDTO>

export const UpdateCollectionItemDTO = CreateCollectionItemDTO.partial()
export type UpdateCollectionItemDTO = z.infer<typeof UpdateCollectionItemDTO>
