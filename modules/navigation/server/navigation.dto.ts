import { z } from 'zod'

// ============================================================================
// Menu DTOs
// ============================================================================

export const CreateNavigationMenuDTO = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  location: z.enum(['header', 'footer', 'sidebar']).optional(),
})
export type CreateNavigationMenuDTO = z.infer<typeof CreateNavigationMenuDTO>

export const UpdateNavigationMenuDTO = CreateNavigationMenuDTO.partial()
export type UpdateNavigationMenuDTO = z.infer<typeof UpdateNavigationMenuDTO>

export const GetNavigationMenusQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
})
export type GetNavigationMenusQuery = z.infer<typeof GetNavigationMenusQuery>

// ============================================================================
// Item DTOs
// ============================================================================

export const CreateNavigationItemDTO = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
  order: z.coerce.number().int().default(0),
  parentId: z.string().uuid().nullable().optional(),
})
export type CreateNavigationItemDTO = z.infer<typeof CreateNavigationItemDTO>

export const UpdateNavigationItemDTO = CreateNavigationItemDTO.partial()
export type UpdateNavigationItemDTO = z.infer<typeof UpdateNavigationItemDTO>

export const GetNavigationItemsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(200).default(200),
  search: z.string().optional(),
})
export type GetNavigationItemsQuery = z.infer<typeof GetNavigationItemsQuery>
