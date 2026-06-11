import { z } from 'zod'

export const WishlistVisibilityEnum = z.enum(['PRIVATE', 'PUBLIC'])
export type WishlistVisibility = z.infer<typeof WishlistVisibilityEnum>
