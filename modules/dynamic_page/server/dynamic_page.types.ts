import { z } from 'zod'

export const CURRENT_SCHEMA_VERSION = 2 as const

// ─── Page Layouts ────────────────────────────────────────────────────────────
// Available site-chrome layouts. A page's `metadata.layout` references one of
// these; extend this list as new layouts ship. `null` means "no chrome".
export const PAGE_LAYOUTS = ['default'] as const
export type PageLayout = (typeof PAGE_LAYOUTS)[number]
export const DEFAULT_PAGE_LAYOUT: PageLayout = 'default'

// Resolve a page's effective layout from its metadata:
// - key absent (legacy pages, no metadata) → DEFAULT_PAGE_LAYOUT (keep chrome)
// - explicit empty/null → null (render bare, no nav/footer)
// - non-empty string → that layout slug
export function resolvePageLayout(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (metadata && typeof metadata === 'object' && 'layout' in metadata) {
    const layout = (metadata as { layout?: unknown }).layout
    return typeof layout === 'string' && layout ? layout : null
  }
  return DEFAULT_PAGE_LAYOUT
}

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
  // Page schedule window (read by the public renderer) — kept here so a metadata
  // round-trip through the editor preserves them instead of stripping them.
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // Per-page site-chrome layout selector. A layout slug picks which chrome
  // (nav + footer) wraps the page; `null` renders the page bare (no nav/footer).
  // Today there is a single layout; the field is a string to grow into many.
  layout: z.string().nullable().optional(),
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
  serverHandler: z.string().nullish(),
  allowedCollections: z.array(z.string()).nullish(),
  isSystem: z.boolean().default(false),
  createdAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
  updatedAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
})

// ─── Collection Field Definition ─────────────────────────────────────────────

export const CollectionFieldSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must start with a letter or underscore'),
  type: z.enum(['text', 'number', 'boolean', 'date', 'url', 'email', 'richtext', 'image', 'json']),
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
})

export const DynamicCollectionRecordSchema = z.object({
  collectionId: z.string(),
  tenantId: z.string(),
  slug: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  fields: z.array(CollectionFieldSchema).default([]),
  isSystem: z.boolean().default(false),
  createdAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
  updatedAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
})

export const DynamicCollectionItemRecordSchema = z.object({
  itemId: z.string(),
  collectionId: z.string(),
  tenantId: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
  updatedAt: z.preprocess((v) => (typeof v === 'string' || v instanceof Date ? new Date(v) : v), z.date()),
})

export const ListCollectionsQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})

export const ListCollectionItemsQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  filter: z.record(z.string(), z.string()).optional(),
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
export type CollectionField = z.infer<typeof CollectionFieldSchema>
export type DynamicCollectionRecord = z.infer<typeof DynamicCollectionRecordSchema>
export type DynamicCollectionItemRecord = z.infer<typeof DynamicCollectionItemRecordSchema>
export type ListCollectionsQuery = z.infer<typeof ListCollectionsQuerySchema>
export type ListCollectionItemsQuery = z.infer<typeof ListCollectionItemsQuerySchema>
