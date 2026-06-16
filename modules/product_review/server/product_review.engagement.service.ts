import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import { singleFlight } from '@nb/redis'
import { ProductReview as ProductReviewEntity } from './entities/product_review.entity'
import { ProductReviewVote as ProductReviewVoteEntity } from './entities/product_review_vote.entity'
import {
  SafeProductReviewSchema, ProductReviewSummarySchema,
  type SafeProductReview, type ProductReviewSummary,
} from './product_review.types'
import type { ModerateReviewDTO, VoteReviewDTO } from './product_review.dto'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { PRODUCT_REVIEW_MESSAGES } from './product_review.messages'
import { bustReview, bustSummary } from './product_review.helpers'

export async function moderate(tenantId: string, reviewId: string, dto: ModerateReviewDTO): Promise<SafeProductReview> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(ProductReviewEntity)
  const row = await repo.findOne({ where: { tenantId, productReviewId: reviewId } })
  if (!row) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

  row.status = dto.status
  if (dto.note) {
    const meta = (row.metadata && typeof row.metadata === 'object') ? row.metadata as Record<string, unknown> : {}
    row.metadata = { ...meta, moderationNote: dto.note }
  }

  const saved = await repo.save(row)
  await bustReview(tenantId, reviewId)
  await bustSummary(tenantId, saved.productId)
  return SafeProductReviewSchema.parse(saved)
}

export async function voteHelpful(tenantId: string, reviewId: string, dto: VoteReviewDTO): Promise<SafeProductReview> {
  const ds = await tenantDataSourceFor(tenantId)

  const saved = await ds.transaction(async (mgr) => {
    const reviewRepo = mgr.getRepository(ProductReviewEntity)
    const voteRepo = mgr.getRepository(ProductReviewVoteEntity)

    const review = await reviewRepo.findOne({ where: { tenantId, productReviewId: reviewId } })
    if (!review) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    // Upsert: one vote per user per review.
    const existing = await voteRepo.findOne({ where: { tenantId, reviewId, userId: dto.userId } })
    if (existing) {
      existing.isHelpful = dto.isHelpful
      await voteRepo.save(existing)
    } else {
      await voteRepo.save(voteRepo.create({
        tenantId,
        reviewId,
        userId: dto.userId,
        isHelpful: dto.isHelpful,
      }))
    }

    review.helpfulCount = await voteRepo.count({ where: { tenantId, reviewId, isHelpful: true } })
    return reviewRepo.save(review)
  })

  await bustReview(tenantId, reviewId)
  return SafeProductReviewSchema.parse(saved)
}

export async function getProductSummary(tenantId: string, productId: string): Promise<ProductReviewSummary> {
  return singleFlight(`review:summary:${tenantId}:${productId}`, async () => {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(ProductReviewEntity).find({
      where: { tenantId, productId, status: 'APPROVED' },
      select: ['rating'],
    })

    const distribution: { '1': number; '2': number; '3': number; '4': number; '5': number } =
      { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    let sum = 0
    for (const r of rows) {
      sum += r.rating
      const key = String(Math.min(5, Math.max(1, r.rating))) as '1' | '2' | '3' | '4' | '5'
      distribution[key] += 1
    }
    const totalReviews = rows.length
    const averageRating = totalReviews === 0 ? 0 : Math.round((sum / totalReviews) * 10) / 10

    return ProductReviewSummarySchema.parse({
      productId,
      totalReviews,
      averageRating,
      distribution,
    })
  })
}
