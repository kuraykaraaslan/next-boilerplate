import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import { ProductReview as ProductReviewEntity } from './entities/product_review.entity'
import { ProductReviewVote as ProductReviewVoteEntity } from './entities/product_review_vote.entity'
import { ReviewVoteSchema, type ReviewVote } from './product_review.types'
import type { GetReviewVotesQuery } from './product_review.dto'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import { PRODUCT_REVIEW_MESSAGES } from './product_review.messages'

/**
 * Read-only listing of the helpful/unhelpful votes attached to a review. Votes
 * are immutable customer engagement records — moderators inspect them but never
 * mutate them from the admin surface.
 */
export async function listByParent(
  tenantId: string,
  reviewId: string,
  query: GetReviewVotesQuery,
): Promise<{ data: ReviewVote[]; total: number }> {
  const ds = await tenantDataSourceFor(tenantId)
  const reviewRepo = ds.getRepository(ProductReviewEntity)
  const review = await reviewRepo.findOne({ where: { tenantId, productReviewId: reviewId } })
  if (!review) throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

  const where: Record<string, unknown> = { tenantId, reviewId }
  if (query.isHelpful !== undefined) where['isHelpful'] = query.isHelpful

  const [rows, total] = await ds.getRepository(ProductReviewVoteEntity).findAndCount({
    where,
    order: { createdAt: 'DESC' },
    skip: query.page * query.pageSize,
    take: query.pageSize,
  })
  return { data: rows.map((r) => ReviewVoteSchema.parse(r)), total }
}
