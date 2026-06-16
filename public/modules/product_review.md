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

## TypeORM entities

- `ProductReview` (system) — `modules/product_review/server/entities/product_review.entity.ts`
- `ProductReviewVote` (system) — `modules/product_review/server/entities/product_review_vote.entity.ts`

## README

# Product Review Module

Tenant-scoped product ratings and reviews. A framework-agnostic service layer (no UI, no API routes) that lets shoppers rate (1–5) and review products, flag verified purchases, vote reviews as helpful, and run reviews through a moderation queue before they appear publicly. Per-product rating summaries (average + star distribution) are computed over approved reviews and cached.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `ProductReview` | `product_reviews` | A single review for a `productId`, scoped to `tenantId`. Authored by a `userId` (registered) or an `authorName` (guest). Carries `rating` (1–5), optional `title`, `body`, `status`, `isVerifiedPurchase`, `helpfulCount`, optional `orderId` (proof-of-purchase ref), and `metadata` (jsonb). Soft-deletable. |
| `ProductReviewVote` | `product_review_votes` | One helpful/not-helpful vote (`isHelpful`) per `userId` per `reviewId`, scoped to `tenantId`. The review's `helpfulCount` is the count of `isHelpful = true` votes. |

Both live in the **tenant DB**, reached via `tenantDataSourceFor(tenantId)`.

---

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

Statuses are defined by `ReviewStatusEnum` (`PENDING` | `APPROVED` | `REJECTED` | `SPAM`).

---

## Service (`ProductReviewService`, all static)

| Method | Description |
| --- | --- |
| `create(tenantId, dto)` | Create a review (status `PENDING`). Enforces integer rating 1–5; busts the product summary cache. |
| `getById(tenantId, reviewId)` | Fetch one review (singleFlight cached). |
| `list(tenantId, query)` | Paginated list with filters (`productId`, `userId`, `status`, `minRating`, `isVerifiedPurchase`) and `sort` (`recent` \| `helpful` \| `rating_high` \| `rating_low`). |
| `update(tenantId, reviewId, dto)` | Author edit (`rating`/`title`/`body`). Always resets status to `PENDING`. |
| `moderate(tenantId, reviewId, dto)` | Set status to `APPROVED` / `REJECTED` / `SPAM`; optional `note` saved to `metadata.moderationNote`. |
| `voteHelpful(tenantId, reviewId, dto)` | Upsert one vote per user, recompute `helpfulCount` from `isHelpful = true` votes. |
| `getProductSummary(tenantId, productId)` | Aggregate over `APPROVED` reviews (cached). |
| `delete(tenantId, reviewId)` | Soft delete. |

DTOs are Zod-validated (`product_review.dto.ts`); return shapes are `SafeProductReview` (omits `deletedAt`) and `ProductReviewSummary` (`product_review.types.ts`). Error strings come from `PRODUCT_REVIEW_MESSAGES` (`product_review.messages.ts`).

---

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

---

## Cache keys

| Key | Written by | Busted by |
| --- | --- | --- |
| `review:<reviewId>` | `getById` (singleFlight) | `update`, `moderate`, `voteHelpful`, `delete` |
| `review:summary:<productId>` | `getProductSummary` (singleFlight) | `create`, `update`, `moderate`, `delete` |

---

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

---

## Settings

This module exposes **no per-tenant settings** and reads none. All behavior (mandatory
moderation queue, 1–5 rating scale, anonymous-review allowance) is hardcoded — see
*Tenant Variability* for candidates.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A fully tenant-scoped product ratings/reviews module (reviews, helpful votes, moderation lifecycle, cached per-product rating summaries) that stores all data per real tenant via tenantDataSourceFor but exposes no per-tenant settings and no per-tenant behavioral branching.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `ProductReview` | `product_reviews` | productId, userId, authorName, rating, title, body, status, isVerifiedPurchase, helpfulCount, orderId, metadata |
| `ProductReviewVote` | `product_review_votes` | reviewId, userId, isHelpful |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| New reviews are unconditionally created with status 'PENDING' (moderation always required), and any author edit forces status back to 'PENDING' | `product_review.service.ts:create / product_review.service.ts:update` | Whether reviews require moderation (auto-approve vs. queue) is a classic per-tenant policy; today every tenant is hardcoded to a mandatory moderation queue with no opt-out. | `reviewAutoApprove` |
| Rating scale is hardcoded to integers 1-5 in create/update validation, the DTOs, and the summary distribution buckets | `product_review.service.ts:create/update (rating < 1 \|\| rating > 5) and product_review.dto.ts (min(1).max(5))` | Some tenants may want a different rating scale (e.g. 1-10 or thumbs); the 1-5 bound is global rather than configurable per tenant. | `reviewMaxRating` |
| Reviews can be created with no userId (anonymous, authorName-only) and isVerifiedPurchase defaults to false with no enforcement | `product_review.service.ts:create and product_review.dto.ts (CreateReviewDTO userId optional, isVerifiedPurchase default false)` | Whether anonymous reviews are allowed, or whether only verified purchasers may review, is commonly a per-tenant store policy; here it is globally permissive with no gating. | `reviewRequireVerifiedPurchase` |
| List page size is capped at a global max of 100 | `product_review.dto.ts:GetReviewsQuery (pageSize.max(100))` | Pagination limits are plausibly per-tenant/plan-tier, but this is minor and may be intentionally global as an infra safeguard. | `reviewListMaxPageSize` |

---

## Dependencies

`db`, `env`, `redis`, `logger`.
