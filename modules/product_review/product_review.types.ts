import { z } from 'zod'
import { ReviewStatusEnum } from './product_review.enums'

export const ProductReviewSchema = z.object({
  productReviewId: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  authorName: z.string().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  body: z.string(),
  status: ReviewStatusEnum,
  isVerifiedPurchase: z.boolean(),
  helpfulCount: z.number().int(),
  media: z.array(z.object({ url: z.string(), type: z.string() })).nullable().optional(),
  orderId: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type ProductReview = z.infer<typeof ProductReviewSchema>

export const SafeProductReviewSchema = ProductReviewSchema.omit({ deletedAt: true })
export type SafeProductReview = z.infer<typeof SafeProductReviewSchema>

export const ReviewVoteSchema = z.object({
  voteId: z.string().uuid(),
  tenantId: z.string().uuid(),
  reviewId: z.string().uuid(),
  userId: z.string().uuid(),
  isHelpful: z.boolean(),
  createdAt: z.date(),
})
export type ReviewVote = z.infer<typeof ReviewVoteSchema>

export const ProductReviewSummarySchema = z.object({
  productId: z.string().uuid(),
  totalReviews: z.number().int(),
  averageRating: z.number(),
  distribution: z.object({
    '1': z.number().int(),
    '2': z.number().int(),
    '3': z.number().int(),
    '4': z.number().int(),
    '5': z.number().int(),
  }),
})
export type ProductReviewSummary = z.infer<typeof ProductReviewSummarySchema>
