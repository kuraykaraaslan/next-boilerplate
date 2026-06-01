import 'reflect-metadata'
import { MoreThanOrEqual } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { ProductReview as ProductReviewEntity } from './entities/product_review.entity'
import { ProductReviewVote as ProductReviewVoteEntity } from './entities/product_review_vote.entity'
import {
  SafeProductReviewSchema, ProductReviewSummarySchema,
  type SafeProductReview, type ProductReviewSummary,
} from './product_review.types'
import type {
  CreateReviewDTO, UpdateReviewDTO, ModerateReviewDTO, VoteReviewDTO, GetReviewsQuery,
} from './product_review.dto'
import { PRODUCT_REVIEW_MESSAGES } from './product_review.messages'

export default class ProductReviewService {

  // ============================================================================
  // Cache helpers
  // ============================================================================

  private static async bustReview(reviewId: string): Promise<void> {
    await redis.del(`review:${reviewId}`)
  }

  private static async bustSummary(productId: string): Promise<void> {
    await redis.del(`review:summary:${productId}`)
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  static async create(tenantId: string, dto: CreateReviewDTO): Promise<SafeProductReview> {
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new Error(PRODUCT_REVIEW_MESSAGES.INVALID_RATING)
    }

    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)

    const review = repo.create({
      tenantId,
      productId: dto.productId,
      userId: dto.userId,
      authorName: dto.authorName,
      rating: dto.rating,
      title: dto.title,
      body: dto.body,
      status: 'PENDING',
      isVerifiedPurchase: dto.isVerifiedPurchase,
      helpfulCount: 0,
      orderId: dto.orderId,
      metadata: dto.metadata,
    })
    const saved = await repo.save(review)
    await ProductReviewService.bustSummary(dto.productId)
    return SafeProductReviewSchema.parse(saved)
  }

  static async getById(tenantId: string, reviewId: string): Promise<SafeProductReview> {
    return singleFlight(`review:${reviewId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(ProductReviewEntity).findOne({
        where: { tenantId, productReviewId: reviewId },
      })
      if (!row) throw new Error(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND)
      return SafeProductReviewSchema.parse(row)
    })
  }

  static async list(tenantId: string, query: GetReviewsQuery): Promise<{ data: SafeProductReview[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)

    const where: Record<string, unknown> = { tenantId }
    if (query.productId) where['productId'] = query.productId
    if (query.userId) where['userId'] = query.userId
    if (query.status) where['status'] = query.status
    if (query.minRating !== undefined) where['rating'] = MoreThanOrEqual(query.minRating)
    if (query.isVerifiedPurchase !== undefined) where['isVerifiedPurchase'] = query.isVerifiedPurchase

    const order: Record<string, 'ASC' | 'DESC'> =
      query.sort === 'helpful' ? { helpfulCount: 'DESC' }
        : query.sort === 'rating_high' ? { rating: 'DESC' }
          : query.sort === 'rating_low' ? { rating: 'ASC' }
            : { createdAt: 'DESC' }

    const [rows, total] = await repo.findAndCount({
      where,
      order,
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => SafeProductReviewSchema.parse(r)), total }
  }

  static async update(tenantId: string, reviewId: string, dto: UpdateReviewDTO): Promise<SafeProductReview> {
    if (dto.rating !== undefined && (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5)) {
      throw new Error(PRODUCT_REVIEW_MESSAGES.INVALID_RATING)
    }

    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)
    const row = await repo.findOne({ where: { tenantId, productReviewId: reviewId } })
    if (!row) throw new Error(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND)

    if (dto.rating !== undefined) row.rating = dto.rating
    if (dto.title !== undefined) row.title = dto.title
    if (dto.body !== undefined) row.body = dto.body
    // Author edit re-enters the moderation queue.
    row.status = 'PENDING'

    const saved = await repo.save(row)
    await ProductReviewService.bustReview(reviewId)
    await ProductReviewService.bustSummary(saved.productId)
    return SafeProductReviewSchema.parse(saved)
  }

  // ============================================================================
  // Moderation
  // ============================================================================

  static async moderate(tenantId: string, reviewId: string, dto: ModerateReviewDTO): Promise<SafeProductReview> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)
    const row = await repo.findOne({ where: { tenantId, productReviewId: reviewId } })
    if (!row) throw new Error(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND)

    row.status = dto.status
    if (dto.note) {
      const meta = (row.metadata && typeof row.metadata === 'object') ? row.metadata as Record<string, unknown> : {}
      row.metadata = { ...meta, moderationNote: dto.note }
    }

    const saved = await repo.save(row)
    await ProductReviewService.bustReview(reviewId)
    await ProductReviewService.bustSummary(saved.productId)
    return SafeProductReviewSchema.parse(saved)
  }

  // ============================================================================
  // Votes
  // ============================================================================

  static async voteHelpful(tenantId: string, reviewId: string, dto: VoteReviewDTO): Promise<SafeProductReview> {
    const ds = await tenantDataSourceFor(tenantId)
    const reviewRepo = ds.getRepository(ProductReviewEntity)
    const voteRepo = ds.getRepository(ProductReviewVoteEntity)

    const review = await reviewRepo.findOne({ where: { tenantId, productReviewId: reviewId } })
    if (!review) throw new Error(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND)

    try {
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
      const saved = await reviewRepo.save(review)
      await ProductReviewService.bustReview(reviewId)
      return SafeProductReviewSchema.parse(saved)
    } catch (error) {
      Logger.error(`${PRODUCT_REVIEW_MESSAGES.VOTE_FAILED}: ${error}`)
      throw new Error(PRODUCT_REVIEW_MESSAGES.VOTE_FAILED)
    }
  }

  // ============================================================================
  // Summary aggregation
  // ============================================================================

  static async getProductSummary(tenantId: string, productId: string): Promise<ProductReviewSummary> {
    return singleFlight(`review:summary:${productId}`, async () => {
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

  // ============================================================================
  // Soft delete
  // ============================================================================

  static async delete(tenantId: string, reviewId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)
    const row = await repo.findOne({ where: { tenantId, productReviewId: reviewId } })
    if (!row) throw new Error(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND)

    await repo.softRemove(row)
    await ProductReviewService.bustReview(reviewId)
    await ProductReviewService.bustSummary(row.productId)
  }
}
