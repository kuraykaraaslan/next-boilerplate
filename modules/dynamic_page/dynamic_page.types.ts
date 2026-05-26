import { z } from 'zod'

export const CURRENT_SCHEMA_VERSION = 2 as const

export const BlockDataSchema = z.object({
  id: z.string(),
  type: z.string(),
  order: z.number(),
  props: z.record(z.string(), z.unknown()),
  hidden: z.boolean().optional(),
  label: z.string().optional(),
  className: z.string().optional(),
})

export const PageMetadataSchema = z.object({
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterCard: z.string().optional(),
  canonical: z.string().optional(),
  robots: z.string().optional(),
}).nullish()

export const DynamicPageRecordSchema = z.object({
  dynamicPageId: z.string(),
  tenantId: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  keywords: z.array(z.string()).default([]),
  sections: z.array(BlockDataSchema).default([]),
  metadata: PageMetadataSchema,
  status: z.string(),
  schemaVersion: z.number().int().min(1).default(CURRENT_SCHEMA_VERSION),
  createdAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
  updatedAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
})

export const DynamicPageTranslationRecordSchema = z.object({
  translationId: z.string(),
  dynamicPageId: z.string(),
  tenantId: z.string(),
  lang: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  sections: z.array(BlockDataSchema).default([]),
  createdAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
  updatedAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
})

export const DynamicPageBlockRecordSchema = z.object({
  blockId: z.string(),
  tenantId: z.string(),
  type: z.string(),
  label: z.string(),
  category: z.string().default('General'),
  description: z.string().nullish(),
  schema: z.record(z.string(), z.unknown()).default({}),
  defaultProps: z.record(z.string(), z.unknown()).default({}),
  template: z.string().default(''),
  script: z.string().nullish(),
  isSystem: z.boolean().default(false),
  createdAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
  updatedAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
})

export const ListPagesQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.enum(['title', 'slug', 'status', 'createdAt', 'updatedAt']).default('updatedAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export type BlockData = z.infer<typeof BlockDataSchema>
export type PageMetadata = z.infer<typeof PageMetadataSchema>
export type DynamicPageRecord = z.infer<typeof DynamicPageRecordSchema>
export type DynamicPageTranslationRecord = z.infer<typeof DynamicPageTranslationRecordSchema>
export type DynamicPageBlockRecord = z.infer<typeof DynamicPageBlockRecordSchema>
export type ListPagesQuery = z.infer<typeof ListPagesQuerySchema>
