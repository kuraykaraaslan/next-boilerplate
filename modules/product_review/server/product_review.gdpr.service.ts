import 'reflect-metadata'
import { tenantDataSourceFor } from '@nb/db'
import { ProductReview as ProductReviewEntity } from './entities/product_review.entity'
import { ProductReviewVote as ProductReviewVoteEntity } from './entities/product_review_vote.entity'
import { SafeProductReviewSchema, type SafeProductReview } from './product_review.types'
import { AppError, ErrorCode } from '@nb/common/server/app-error'
import { PRODUCT_REVIEW_MESSAGES } from './product_review.messages'
import { bustReview, bustSummary } from './product_review.helpers'

export async function remove(tenantId: string, reviewId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId)
  const repo = ds.getRepository(ProductReviewEntity)
  const row = await repo.findOne({ where: { tenantId, productReviewId: reviewId } })
  if (!row) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

  await repo.softRemove(row)
  await bustReview(tenantId, reviewId)
  await bustSummary(tenantId, row.productId)
}

/**
 * Right-to-erasure for a user's reviews. ANONYMIZE (default) strips PII while
 * keeping the rating for aggregate integrity; DELETE removes reviews + votes.
 */
export async function eraseForUser(
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
  for (const pid of productIds) await bustSummary(tenantId, pid)
  return { reviews: rows.length }
}

/** Export a user's reviews (GDPR data portability). */
export async function exportForUser(tenantId: string, userId: string): Promise<{ reviews: SafeProductReview[] }> {
  const ds = await tenantDataSourceFor(tenantId)
  const rows = await ds.getRepository(ProductReviewEntity).find({ where: { tenantId, userId } })
  return { reviews: rows.map((r) => SafeProductReviewSchema.parse(r)) }
}
