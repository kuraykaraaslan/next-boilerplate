import { z } from 'zod'

export const WishlistSchema = z.object({
  wishlistId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  isPublic: z.boolean(),
  shareToken: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Wishlist = z.infer<typeof WishlistSchema>

export const SafeWishlistSchema = WishlistSchema.omit({ deletedAt: true })
export type SafeWishlist = z.infer<typeof SafeWishlistSchema>

export const WishlistItemSchema = z.object({
  wishlistItemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  wishlistId: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  note: z.string().nullable(),
  createdAt: z.date(),
})
export type WishlistItem = z.infer<typeof WishlistItemSchema>

export const WishlistWithItemsSchema = SafeWishlistSchema.extend({
  items: z.array(WishlistItemSchema),
  itemCount: z.number().int().nonnegative(),
})
export type WishlistWithItems = z.infer<typeof WishlistWithItemsSchema>
