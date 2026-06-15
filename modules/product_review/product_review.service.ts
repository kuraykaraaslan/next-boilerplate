import 'reflect-metadata'
import type { SafeProductReview, ProductReviewSummary } from './product_review.types'
import type {
  CreateReviewDTO, UpdateReviewDTO, ModerateReviewDTO, VoteReviewDTO, GetReviewsQuery,
} from './product_review.dto'
import {
  verifyPurchase, create, getById, list, update,
} from './product_review.crud.service'
import { moderate, voteHelpful, getProductSummary } from './product_review.engagement.service'
import { remove, eraseForUser, exportForUser } from './product_review.gdpr.service'

/**
 * Product-review service facade. The implementation is split across focused
 * modules (`product_review.crud.service` CRUD + purchase verification,
 * `product_review.engagement.service` moderation/votes/summary,
 * `product_review.gdpr.service` delete/erasure/export, `product_review.helpers`
 * cache busting); this class preserves the single `ProductReviewService.*`
 * entry point its callers depend on.
 */
export default class ProductReviewService {
  static verifyPurchase(tenantId: string, userId: string | undefined, productId: string): Promise<boolean> {
    return verifyPurchase(tenantId, userId, productId)
  }

  static create(tenantId: string, dto: CreateReviewDTO): Promise<SafeProductReview> {
    return create(tenantId, dto)
  }

  static getById(tenantId: string, reviewId: string): Promise<SafeProductReview> {
    return getById(tenantId, reviewId)
  }

  static list(tenantId: string, query: GetReviewsQuery): Promise<{ data: SafeProductReview[]; total: number }> {
    return list(tenantId, query)
  }

  static update(tenantId: string, reviewId: string, dto: UpdateReviewDTO): Promise<SafeProductReview> {
    return update(tenantId, reviewId, dto)
  }

  static moderate(tenantId: string, reviewId: string, dto: ModerateReviewDTO): Promise<SafeProductReview> {
    return moderate(tenantId, reviewId, dto)
  }

  static voteHelpful(tenantId: string, reviewId: string, dto: VoteReviewDTO): Promise<SafeProductReview> {
    return voteHelpful(tenantId, reviewId, dto)
  }

  static getProductSummary(tenantId: string, productId: string): Promise<ProductReviewSummary> {
    return getProductSummary(tenantId, productId)
  }

  static delete(tenantId: string, reviewId: string): Promise<void> {
    return remove(tenantId, reviewId)
  }

  static eraseForUser(
    tenantId: string, userId: string, mode: 'DELETE' | 'ANONYMIZE' = 'ANONYMIZE',
  ): Promise<{ reviews: number }> {
    return eraseForUser(tenantId, userId, mode)
  }

  static exportForUser(tenantId: string, userId: string): Promise<{ reviews: SafeProductReview[] }> {
    return exportForUser(tenantId, userId)
  }
}
