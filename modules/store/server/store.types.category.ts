import { z } from 'zod'
import { CategorySpecTypeEnum } from './store.enums'
import { CategoryTranslationsSchema } from './store.types.shared'

export const StoreCategorySchema = z.object({
  categoryId: z.string().uuid(),
  tenantId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  translations: CategoryTranslationsSchema,
  imageUrl: z.string().nullable(),
  sortOrder: z.coerce.number().int(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type StoreCategory = z.infer<typeof StoreCategorySchema>

export const StoreCategorySpecSchema = z.object({
  specId: z.string().uuid(),
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  key: z.string(),
  label: z.string(),
  type: CategorySpecTypeEnum,
  unit: z.string().nullable(),
  placeholder: z.string().nullable(),
  options: z.array(z.string()).nullable(),
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  sortOrder: z.coerce.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type StoreCategorySpec = z.infer<typeof StoreCategorySpecSchema>

export const StoreCategoryWithSpecsSchema = StoreCategorySchema.extend({
  specs: z.array(StoreCategorySpecSchema),
  children: z.array(StoreCategorySchema).optional(),
})
export type StoreCategoryWithSpecs = z.infer<typeof StoreCategoryWithSpecsSchema>
