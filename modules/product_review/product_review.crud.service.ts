import 'reflect-metadata'
import { MoreThanOrEqual } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import { singleFlight } from '@/modules/redis'
import SettingService from '@/modules/setting/setting.service'
import Logger from '@/modules/logger'
import { ProductReview as ProductReviewEntity } from './entities/product_review.entity'
import { SafeProductReviewSchema, type SafeProductReview } from './product_review.types'
import type { CreateReviewDTO, UpdateReviewDTO, GetReviewsQuery } from './product_review.dto'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { PRODUCT_REVIEW_MESSAGES } from './product_review.messages'
import { bustReview, bustSummary } from './product_review.helpers'

/**
 * Verify a user actually purchased a product, using converted carts as the
 * real purchase signal (a CONVERTED cart owned by the user containing the
 * product). Returns true when a matching purchase exists.
 */
export async function verifyPurchase(tenantId: string, userId: string | undefined, productId: string): Promise<boolean> {
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

export async function create(tenantId: string, dto: CreateReviewDTO): Promise<SafeProductReview> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(ProductReviewEntity)

  // Real verified-purchase computation (client value is ignored).
  const isVerifiedPurchase = await verifyPurchase(tenantId, dto.userId, dto.productId)

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
  await bustSummary(tenantId, dto.productId)
  return SafeProductReviewSchema.parse(saved)
}

export async function getById(tenantId: string, reviewId: string): Promise<SafeProductReview> {
  return singleFlight(`review:${tenantId}:${reviewId}`, async () => {
    const ds = await tenantDataSourceFor(tenantId)
    const row = await ds.getRepository(ProductReviewEntity).findOne({
      where: { tenantId, productReviewId: reviewId },
    })
    if (!row) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return SafeProductReviewSchema.parse(row)
  })
}

export async function list(tenantId: string, query: GetReviewsQuery): Promise<{ data: SafeProductReview[]; total: number }> {
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

export async function update(tenantId: string, reviewId: string, dto: UpdateReviewDTO): Promise<SafeProductReview> {
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
  await bustReview(tenantId, reviewId)
  await bustSummary(tenantId, saved.productId)
  return SafeProductReviewSchema.parse(saved)
}
