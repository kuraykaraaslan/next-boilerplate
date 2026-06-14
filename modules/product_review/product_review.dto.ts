import { z } from 'zod'
import { ReviewStatusEnum } from './product_review.enums'

// ============================================================================
// Review DTOs
// ============================================================================

export const ReviewMediaItemSchema = z.object({
  url: z.string().url(),
  type: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
})
export type ReviewMediaItem = z.infer<typeof ReviewMediaItemSchema>

export const CreateReviewDTO = z.object({
  productId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  authorName: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  body: z.string().min(1),
  orderId: z.string().uuid().optional(),
  media: z.array(ReviewMediaItemSchema).max(10).optional(),
  // isVerifiedPurchase is no longer trusted from the client — the service
  // verifies it against real purchase history. Retained for back-compat (ignored).
  isVerifiedPurchase: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional(),
})
export type CreateReviewDTO = z.infer<typeof CreateReviewDTO>

export const UpdateReviewDTO = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  body: z.string().min(1).optional(),
  media: z.array(ReviewMediaItemSchema).max(10).optional(),
})
export type UpdateReviewDTO = z.infer<typeof UpdateReviewDTO>

export const ReviewEraseDTO = z.object({
  userId: z.string().uuid(),
  mode: z.enum(['DELETE', 'ANONYMIZE']).default('ANONYMIZE'),
})
export type ReviewEraseDTO = z.infer<typeof ReviewEraseDTO>

export const ModerateReviewDTO = z.object({
  status: ReviewStatusEnum,
  note: z.string().optional(),
})
export type ModerateReviewDTO = z.infer<typeof ModerateReviewDTO>

export const VoteReviewDTO = z.object({
  userId: z.string().uuid(),
  isHelpful: z.boolean().default(true),
})
export type VoteReviewDTO = z.infer<typeof VoteReviewDTO>

export const GetReviewsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  productId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  status: ReviewStatusEnum.optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  isVerifiedPurchase: z.boolean().optional(),
  sort: z.enum(['recent', 'helpful', 'rating_high', 'rating_low']).default('recent'),
})
export type GetReviewsQuery = z.infer<typeof GetReviewsQuery>
