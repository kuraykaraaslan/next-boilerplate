import { z } from 'zod'
import { CategorySpecTypeEnum } from './store.enums'

// Category DTOs
export const CreateCategoryDTO = z.object({
  parentId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  translations: z.record(z.string(), z.object({
    name: z.string().optional(), description: z.string().optional(),
  })).optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
})
export type CreateCategoryDTO = z.infer<typeof CreateCategoryDTO>

export const UpdateCategoryDTO = CreateCategoryDTO.partial()
export type UpdateCategoryDTO = z.infer<typeof UpdateCategoryDTO>

export const GetCategoriesQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(200).default(50),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  withSpecs: z.boolean().default(false),
  withChildren: z.boolean().default(false),
})
export type GetCategoriesQuery = z.infer<typeof GetCategoriesQuery>

// Spec DTOs
export const CreateSpecDTO = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(100),
  type: CategorySpecTypeEnum.default('TEXT'),
  unit: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(true),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
})
export type CreateSpecDTO = z.infer<typeof CreateSpecDTO>

export const UpdateSpecDTO = CreateSpecDTO.partial()
export type UpdateSpecDTO = z.infer<typeof UpdateSpecDTO>
