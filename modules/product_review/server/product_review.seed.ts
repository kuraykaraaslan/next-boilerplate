import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@nb/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID, SEED_ORDER_ID } from '@nb/seed/server/seed.context';
import { ProductReview } from './entities/product_review.entity';
import { ProductReviewVote } from './entities/product_review_vote.entity';

/**
 * Demo seed for the `product_review` module.
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows instead of duplicating them. Neither entity
 *    declares a `@Unique`, so we use a stable business composite:
 *      ProductReview     → (tenantId, productId, authorName)
 *      ProductReviewVote → (tenantId, reviewId, userId)
 *  - Use *valid* enum values only — review status is one of
 *    PENDING / APPROVED / REJECTED / SPAM (see product_review.enums.ts).
 *  - Numbers are numbers (rating / helpfulCount are ints).
 *  - Both entities carry a `tenantId` column → tenant-scoped: `ctx.repo(...)`.
 *  - Cross-module ids (productId, userId, orderId) are bare uuids; pull from
 *    `ctx.refs` when present, else fall back to deterministic literals.
 */
export async function seedProductReview(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // ── Cross-module references (no FKs across tenant DBs) ─────────────────────
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;
  const orderId = (refs.orderId as string) ?? SEED_ORDER_ID;

  // ── Reviews (varied status / rating / verified / author) ───────────────────
  // Covers: an approved verified-purchase 5★ with helpful votes, an approved
  // anonymous (no userId) 4★, a pending unverified 3★, a rejected 2★ and a
  // spam 1★ — exercising every ReviewStatus value.
  const reviewRepo = ctx.repo<ProductReview>(ProductReview);

  type ReviewDef = {
    key: string; // stable authorName used as the natural-key segment
    userId?: string;
    authorName: string;
    rating: number;
    title?: string;
    body: string;
    status: string;
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    orderId?: string;
    metadata?: unknown;
    daysAgo: number;
  };

  const reviewDefs: ReviewDef[] = [
    {
      key: 'Alice Buyer',
      userId,
      authorName: 'Alice Buyer',
      rating: 5,
      title: 'Exceeded my expectations',
      body: 'Fast, well built and great value. Setup took minutes and it has been rock solid since.',
      status: 'APPROVED',
      isVerifiedPurchase: true,
      helpfulCount: 12,
      orderId,
      metadata: { locale: 'en-US', source: 'web', pros: ['fast', 'value'], cons: [] },
      daysAgo: 14,
    },
    {
      key: 'Guest Reviewer',
      // anonymous review — no userId, only an authorName
      authorName: 'Guest Reviewer',
      rating: 4,
      title: 'Solid, minor quibbles',
      body: 'Does everything advertised. Knocked a star off for the short cable, otherwise happy.',
      status: 'APPROVED',
      isVerifiedPurchase: false,
      helpfulCount: 3,
      metadata: { locale: 'en-GB', source: 'mobile' },
      daysAgo: 7,
    },
    {
      key: 'Pending Pete',
      userId: adminUserId,
      authorName: 'Pending Pete',
      rating: 3,
      title: 'Awaiting moderation',
      body: 'It is fine. Average performance for the price, nothing remarkable either way.',
      status: 'PENDING',
      isVerifiedPurchase: false,
      helpfulCount: 0,
      metadata: { locale: 'tr-TR', source: 'web' },
      daysAgo: 2,
    },
    {
      key: 'Angry Andy',
      userId: SEED_USER_ID,
      authorName: 'Angry Andy',
      rating: 2,
      title: 'Disappointed',
      body: 'Stopped working after a week and support was slow to respond.',
      status: 'REJECTED',
      isVerifiedPurchase: true,
      helpfulCount: 1,
      orderId,
      metadata: { locale: 'de-DE', source: 'web', moderationNote: 'off-topic / unverifiable' },
      daysAgo: 21,
    },
    {
      key: 'Spam Sam',
      authorName: 'Spam Sam',
      rating: 1,
      title: 'BUY CHEAP NOW!!!',
      body: 'Visit my-totally-legit-deals.example for 90% off everything, click here!!!',
      status: 'SPAM',
      isVerifiedPurchase: false,
      helpfulCount: 0,
      metadata: { locale: 'en-US', source: 'web', flagged: true },
      daysAgo: 1,
    },
  ];

  const now = Date.now();
  const reviews: Record<string, ProductReview> = {};
  for (const def of reviewDefs) {
    const createdAt = new Date(now - def.daysAgo * 24 * 60 * 60 * 1000);
    reviews[def.key] = await foc(reviewRepo,
      { tenantId, productId, authorName: def.authorName } as FindOptionsWhere<ProductReview>,
      {
        tenantId,
        productId,
        userId: def.userId,
        authorName: def.authorName,
        rating: def.rating,
        title: def.title,
        body: def.body,
        status: def.status,
        isVerifiedPurchase: def.isVerifiedPurchase,
        helpfulCount: def.helpfulCount,
        orderId: def.orderId,
        metadata: def.metadata,
        createdAt,
        updatedAt: createdAt,
      },
    );
  }

  // ── Helpful/unhelpful votes (one per (review,user); mixed isHelpful) ───────
  const voteRepo = ctx.repo<ProductReviewVote>(ProductReviewVote);

  type VoteDef = { reviewKey: string; userId: string; isHelpful: boolean; daysAgo: number };
  const voteDefs: VoteDef[] = [
    { reviewKey: 'Alice Buyer', userId: adminUserId, isHelpful: true, daysAgo: 10 },
    { reviewKey: 'Alice Buyer', userId: SEED_USER_ID, isHelpful: true, daysAgo: 9 },
    { reviewKey: 'Guest Reviewer', userId: userId, isHelpful: true, daysAgo: 5 },
    { reviewKey: 'Angry Andy', userId: adminUserId, isHelpful: false, daysAgo: 3 },
  ];

  for (const v of voteDefs) {
    const review = reviews[v.reviewKey];
    await foc(voteRepo,
      { tenantId, reviewId: review.productReviewId, userId: v.userId } as FindOptionsWhere<ProductReviewVote>,
      {
        tenantId,
        reviewId: review.productReviewId,
        userId: v.userId,
        isHelpful: v.isHelpful,
        createdAt: new Date(now - v.daysAgo * 24 * 60 * 60 * 1000),
      },
    );
  }

  // ── Publish references later modules might consume ─────────────────────────
  refs.productReviewId = reviews['Alice Buyer'].productReviewId;

  ctx.log(`product_review: ${reviewDefs.length} reviews, ${voteDefs.length} votes for ${tenantId}`);
}
