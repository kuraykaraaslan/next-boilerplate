import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import Logger from '@kuraykaraaslan/logger'
import { ProductReview as ProductReviewEntity } from './entities/product_review.entity'
import { SafeProductReviewSchema, type SafeProductReview } from './product_review.types'
import type { ReviewStatus } from './product_review.enums'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { PRODUCT_REVIEW_MESSAGES } from './product_review.messages'
import { bustReview, bustSummary } from './product_review.helpers'

/**
 * Moderation workflow for a single review. Each transition asserts the source
 * state (PENDING is the only state from which a review may be moderated, though
 * re-moderation between terminal states is also permitted), sets the target
 * state, appends a moderation note + audit entry to `metadata`, busts caches and
 * returns the updated review.
 */
async function transition(
  tenantId: string,
  reviewId: string,
  to: ReviewStatus,
  note?: string,
): Promise<SafeProductReview> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(ProductReviewEntity)
  const row = await repo.findOne({ where: { tenantId, productReviewId: reviewId } })
  if (!row) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

  if (row.status === to) {
    throw new AppError(PRODUCT_REVIEW_MESSAGES.ALREADY_IN_STATUS, 409, ErrorCode.CONFLICT)
  }

  const from = row.status
  row.status = to

  // Append an audit trail to metadata since the module has no event entity.
  const meta = (row.metadata && typeof row.metadata === 'object') ? row.metadata as Record<string, unknown> : {}
  const log = Array.isArray(meta['moderationLog']) ? meta['moderationLog'] as unknown[] : []
  log.push({ from, to, note: note ?? null, at: new Date().toISOString() })
  row.metadata = { ...meta, moderationLog: log, ...(note ? { moderationNote: note } : {}) }

  const saved = await repo.save(row)
  await bustReview(tenantId, reviewId)
  await bustSummary(tenantId, saved.productId)
  Logger.info(`[product_review] review ${reviewId} ${from} -> ${to}`)
  return SafeProductReviewSchema.parse(saved)
}

export function approve(tenantId: string, reviewId: string, note?: string): Promise<SafeProductReview> {
  return transition(tenantId, reviewId, 'APPROVED', note)
}

export function reject(tenantId: string, reviewId: string, note?: string): Promise<SafeProductReview> {
  return transition(tenantId, reviewId, 'REJECTED', note)
}

export function markSpam(tenantId: string, reviewId: string, note?: string): Promise<SafeProductReview> {
  return transition(tenantId, reviewId, 'SPAM', note)
}
