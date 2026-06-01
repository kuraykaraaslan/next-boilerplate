# Product Review

- **id:** `product_review`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/product_review/`
- **tags:** review, rating, ecommerce, moderation
- **icon:** `fas fa-star`
- **hasNextLayer:** false

Tenant-aware product ratings and reviews with verified-purchase flags, helpful voting, moderation lifecycle, and cached per-product rating summaries.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`

## Services

- `product_review.service.ts`

## DTOs

- `product_review.dto.ts`

## Entities

- `product_review.entity.ts`
- `product_review_vote.entity.ts`

## Enums

- `product_review.enums.ts`

## Message keys

- `product_review.messages.ts`

## TypeORM entities

- `ProductReview` (system) — `modules/product_review/entities/product_review.entity.ts`
- `ProductReviewVote` (system) — `modules/product_review/entities/product_review_vote.entity.ts`

## README

# product_review

Tenant-aware product ratings and reviews. Framework-agnostic service layer — no UI.

## Purpose

Lets shoppers rate (1–5) and review products, flag verified purchases, vote reviews
as helpful, and run reviews through a moderation queue before they appear publicly.
Per-product rating summaries (average + star distribution) are computed over approved
reviews and cached.

## Domain model

- **ProductReview** (`product_reviews`) — a single review for a `productId`, scoped to
  `tenantId`. Authored by a `userId` (registered) or an `authorName` (guest). Carries
  `rating` (1–5), optional `title`, `body`, `status`, `isVerifiedPurchase`,
  `helpfulCount`, optional `orderId` (proof-of-purchase ref), `metadata` (jsonb).
  Soft-deletable.
- **ProductReviewVote** (`product_review_votes`) — one helpful/not-helpful vote per
  `userId` per `reviewId`, scoped to `tenantId`. `helpfulCount` on the review is the
  count of `isHelpful = true` votes.

## Moderation lifecycle

```
            create / author-edit
                    │
                    ▼
                 PENDING ──── moderate ────▶ APPROVED   (publicly visible, counts in summary)
                    │                   ├──▶ REJECTED
                    │                   └──▶ SPAM
```

- New reviews start `PENDING`.
- Author edits (`update`) reset status back to `PENDING` (re-enter the queue).
- `moderate` transitions to `APPROVED` / `REJECTED` / `SPAM`. A `note` is stored under
  `metadata.moderationNote`.
- Only `APPROVED` reviews are aggregated into the product summary. For public product
  pages, call `list` with `status: 'APPROVED'`.

## Service methods (`ProductReviewService`, all static)

| Method | Description |
| --- | --- |
| `create(tenantId, dto)` | Create a review (status `PENDING`). Enforces rating 1–5. |
| `getById(tenantId, reviewId)` | Fetch one review (singleFlight cached). |
| `list(tenantId, query)` | Paginated list with filters (`productId`, `userId`, `status`, `minRating`, `isVerifiedPurchase`) and `sort` (`recent` \| `helpful` \| `rating_high` \| `rating_low`). |
| `update(tenantId, reviewId, dto)` | Author edit (rating/title/body). Resets status to `PENDING`. |
| `moderate(tenantId, reviewId, dto)` | Set status to `APPROVED` / `REJECTED` / `SPAM`. |
| `voteHelpful(tenantId, reviewId, dto)` | Upsert one vote per user, recompute `helpfulCount`. |
| `getProductSummary(tenantId, productId)` | Aggregate over `APPROVED` reviews (cached). |
| `delete(tenantId, reviewId)` | Soft delete. |

## Summary aggregation

`getProductSummary` scans `APPROVED` reviews for a product and returns:

```ts
{
  productId,
  totalReviews,                       // count of approved reviews
  averageRating,                      // mean rating, rounded to 1 decimal (0 when none)
  distribution: { '1': n, '2': n, '3': n, '4': n, '5': n }, // per-star counts
}
```

## Cache keys

| Key | Written by | Busted by |
| --- | --- | --- |
| `review:<reviewId>` | `getById` (singleFlight) | `update`, `moderate`, `voteHelpful`, `delete` |
| `review:summary:<productId>` | `getProductSummary` (singleFlight) | `create`, `update`, `moderate`, `delete` |

## Dependencies

`db`, `env`, `redis`, `logger`.

## Usage

```ts
import { ProductReviewService } from '@/modules/product_review'

// Shopper submits a review (enters moderation as PENDING)
const review = await ProductReviewService.create(tenantId, {
  productId,
  userId,
  rating: 5,
  title: 'Great product',
  body: 'Exactly as described.',
  isVerifiedPurchase: true,
  orderId,
})

// Moderator approves it
await ProductReviewService.moderate(tenantId, review.productReviewId, { status: 'APPROVED' })

// Another user marks it helpful
await ProductReviewService.voteHelpful(tenantId, review.productReviewId, { userId: otherUserId })

// Public product page: approved reviews + rating summary
const { data } = await ProductReviewService.list(tenantId, { productId, status: 'APPROVED', sort: 'helpful' })
const summary = await ProductReviewService.getProductSummary(tenantId, productId)
```
