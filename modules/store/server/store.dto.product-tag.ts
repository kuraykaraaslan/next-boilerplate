import { z } from 'zod'

// ProductTag DTOs (configurable product-tag master-data).
export const CreateProductTagDTO = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  isActive: z.boolean().optional().default(true),
})
export type CreateProductTagDTO = z.infer<typeof CreateProductTagDTO>

export const UpdateProductTagDTO = CreateProductTagDTO.partial()
export type UpdateProductTagDTO = z.infer<typeof UpdateProductTagDTO>

export const GetProductTagsQuery = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().optional(),
})
export type GetProductTagsQuery = z.infer<typeof GetProductTagsQuery>
