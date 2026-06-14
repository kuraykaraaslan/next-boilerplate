import 'reflect-metadata'
import { MoreThanOrEqual } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import SettingService from '@/modules/setting/setting.service'
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
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { PRODUCT_REVIEW_MESSAGES } from './product_review.messages'

export default class ProductReviewService {

  // ============================================================================
  // Cache helpers
  // ============================================================================

  private static async bustReview(tenantId: string, reviewId: string): Promise<void> {
    await redis.del(`review:${tenantId}:${reviewId}`).catch(() => {})
  }

  private static async bustSummary(tenantId: string, productId: string): Promise<void> {
    await redis.del(`review:summary:${tenantId}:${productId}`).catch(() => {})
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  /**
   * Verify a user actually purchased a product, using converted carts as the
   * real purchase signal (a CONVERTED cart owned by the user containing the
   * product). Returns true when a matching purchase exists.
   */
  static async verifyPurchase(tenantId: string, userId: string | undefined, productId: string): Promise<boolean> {
    if (!userId) return false
    try {
      const ds = await tenantDataSourceFor(tenantId)
      const { Cart } = await import('@/modules/payment_cart/entities/cart.entity')
      const { CartItem } = await import('@/modules/payment_cart/entities/cart_item.entity')
      const count = await ds.getRepository(CartItem).createQueryBuilder('ci')
        .innerJoin(Cart, 'c', 'c."cartId" = ci."cartId"')
        .where('ci."tenantId" = :tenantId', { tenantId })
        .andWhere('ci."productId" = :productId', { productId })
        .andWhere('c."userId" = :userId', { userId })
        .andWhere('c."status" = :status', { status: 'CONVERTED' })
        .getCount()
      return count > 0
    } catch (e) {
      Logger.warn(`[product_review] purchase verification failed: ${e instanceof Error ? e.message : e}`)
      return false
    }
  }

  static async create(tenantId: string, dto: CreateReviewDTO): Promise<SafeProductReview> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)

    // Real verified-purchase computation (client value is ignored).
    const isVerifiedPurchase = await ProductReviewService.verifyPurchase(tenantId, dto.userId, dto.productId)

    // Per-tenant policy: require a verified purchase + auto-approval.
    const settings = await SettingService.getByKeys(tenantId, ['reviewRequireVerifiedPurchase', 'reviewAutoApprove'])
      .catch(() => ({} as Record<string, string>))
    if (settings.reviewRequireVerifiedPurchase === 'true' && !isVerifiedPurchase) {
      throw new AppError(PRODUCT_REVIEW_MESSAGES.VERIFIED_PURCHASE_REQUIRED, 403, ErrorCode.FORBIDDEN)
    }
    const autoApprove = settings.reviewAutoApprove === 'true'

    const review = repo.create({
      tenantId,
      productId: dto.productId,
      userId: dto.userId,
      authorName: dto.authorName,
      rating: dto.rating,
      title: dto.title,
      body: dto.body,
      status: autoApprove ? 'APPROVED' : 'PENDING',
      isVerifiedPurchase,
      helpfulCount: 0,
      media: dto.media,
      orderId: dto.orderId,
      metadata: dto.metadata,
    })
    const saved = await repo.save(review)
    await ProductReviewService.bustSummary(tenantId, dto.productId)
    return SafeProductReviewSchema.parse(saved)
  }

  static async getById(tenantId: string, reviewId: string): Promise<SafeProductReview> {
    return singleFlight(`review:${tenantId}:${reviewId}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const row = await ds.getRepository(ProductReviewEntity).findOne({
        where: { tenantId, productReviewId: reviewId },
      })
      if (!row) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
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
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)
    const row = await repo.findOne({ where: { tenantId, productReviewId: reviewId } })
    if (!row) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    if (dto.rating !== undefined) row.rating = dto.rating
    if (dto.title !== undefined) row.title = dto.title
    if (dto.body !== undefined) row.body = dto.body
    if (dto.media !== undefined) row.media = dto.media
    // Author edit re-enters the moderation queue.
    row.status = 'PENDING'

    const saved = await repo.save(row)
    await ProductReviewService.bustReview(tenantId, reviewId)
    await ProductReviewService.bustSummary(tenantId, saved.productId)
    return SafeProductReviewSchema.parse(saved)
  }

  // ============================================================================
  // Moderation
  // ============================================================================

  static async moderate(tenantId: string, reviewId: string, dto: ModerateReviewDTO): Promise<SafeProductReview> {
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
    await ProductReviewService.bustReview(tenantId, reviewId)
    await ProductReviewService.bustSummary(tenantId, saved.productId)
    return SafeProductReviewSchema.parse(saved)
  }

  // ============================================================================
  // Votes
  // ============================================================================

  static async voteHelpful(tenantId: string, reviewId: string, dto: VoteReviewDTO): Promise<SafeProductReview> {
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

    await ProductReviewService.bustReview(tenantId, reviewId)
    return SafeProductReviewSchema.parse(saved)
  }

  // ============================================================================
  // Summary aggregation
  // ============================================================================

  static async getProductSummary(tenantId: string, productId: string): Promise<ProductReviewSummary> {
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

  // ============================================================================
  // Soft delete
  // ============================================================================

  static async delete(tenantId: string, reviewId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)
    const row = await repo.findOne({ where: { tenantId, productReviewId: reviewId } })
    if (!row) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    await repo.softRemove(row)
    await ProductReviewService.bustReview(tenantId, reviewId)
    await ProductReviewService.bustSummary(tenantId, row.productId)
  }

  // ============================================================================
  // GDPR — right to erasure / data portability
  // ============================================================================

  /**
   * Right-to-erasure for a user's reviews. ANONYMIZE (default) strips PII while
   * keeping the rating for aggregate integrity; DELETE removes reviews + votes.
   */
  static async eraseForUser(
    tenantId: string, userId: string, mode: 'DELETE' | 'ANONYMIZE' = 'ANONYMIZE',
  ): Promise<{ reviews: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(ProductReviewEntity)
    const rows = await repo.find({ where: { tenantId, userId } })
    if (rows.length === 0) return { reviews: 0 }

    if (mode === 'DELETE') {
      const ids = rows.map((r) => r.productReviewId)
      const { In } = await import('typeorm')
      await ds.getRepository(ProductReviewVoteEntity).delete({ tenantId, reviewId: In(ids) }).catch(() => {})
      await repo.remove(rows)
    } else {
      for (const r of rows) {
        r.userId = undefined
        r.authorName = '[deleted]'
        r.metadata = null as unknown as undefined
        await repo.save(r)
      }
    }
    const productIds = [...new Set(rows.map((r) => r.productId))]
    for (const pid of productIds) await ProductReviewService.bustSummary(tenantId, pid)
    return { reviews: rows.length }
  }

  /** Export a user's reviews (GDPR data portability). */
  static async exportForUser(tenantId: string, userId: string): Promise<{ reviews: SafeProductReview[] }> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(ProductReviewEntity).find({ where: { tenantId, userId } })
    return { reviews: rows.map((r) => SafeProductReviewSchema.parse(r)) }
  }
}
