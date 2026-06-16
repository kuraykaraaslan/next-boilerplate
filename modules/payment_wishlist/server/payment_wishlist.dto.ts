import { z } from 'zod'

// ============================================================================
// Wishlist DTOs
// ============================================================================

export const CreateWishlistDTO = z.object({
  userId: z.string().uuid(),
  name: z.string().default('Default'),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type CreateWishlistDTO = z.infer<typeof CreateWishlistDTO>

export const UpdateWishlistDTO = z.object({
  name: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type UpdateWishlistDTO = z.infer<typeof UpdateWishlistDTO>

// ============================================================================
// Wishlist Item DTOs
// ============================================================================

export const AddWishlistItemDTO = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  note: z.string().optional(),
})
export type AddWishlistItemDTO = z.infer<typeof AddWishlistItemDTO>

export const GetWishlistsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
})
export type GetWishlistsQuery = z.infer<typeof GetWishlistsQuery>
