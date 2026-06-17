import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@kuraykaraaslan/seed/server/seed.context';
import { SEED_USER_ID } from '@kuraykaraaslan/seed/server/seed.context';
import { Coupon } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon_redemption.entity';

/**
 * Coupon module seed.
 *
 * Two tenant-scoped entities (both carry a `tenantId` column → `ctx.repo`):
 *  - Coupon            natural key @Unique(['tenantId', 'code'])
 *  - CouponRedemption  no @Unique; we dedupe on (tenantId, couponId, paymentId)
 *
 * House rules (mirrors store.seed.ts):
 *  - Every write goes through `ctx.foc` with a natural key so re-runs reuse rows.
 *  - Only valid enum strings: discountType ∈ PERCENTAGE | FIXED_AMOUNT,
 *    status ∈ ACTIVE | INACTIVE | EXPIRED | ARCHIVED (see coupon.enums.ts).
 *  - Numbers are numbers — decimal columns are mapped back to `number`.
 *  - Cross-module ids are bare uuids read from `ctx.refs` with a literal fallback.
 */
export async function seedCoupon(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module references (soft uuids; no FK across databases).
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const planProductId = (refs.planProductId as string) ?? 'a1000000-0000-4000-8000-000000000002';
  const categoryId = (refs.categoryId as string) ?? 'a1000000-0000-4000-8000-000000000003';

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  // ── Coupons (percentage / fixed-amount / expired / archived) ────────────────
  type CouponDef = {
    code: string;
    name: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    currency?: string;
    scope?: {
      productIds?: string[];
      planIds?: string[];
      categoryIds?: string[];
      providers?: string[];
      appliesTo?: 'line' | 'cart';
      minimumAmount?: number;
    };
    maxUses?: number;
    maxUsesPerTenant?: number;
    usedCount: number;
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'ARCHIVED';
    startsAt?: Date;
    expiresAt?: Date;
  };

  const couponDefs: CouponDef[] = [
    {
      // Active cart-wide percentage discount with a spend threshold.
      code: 'WELCOME10',
      name: 'Welcome 10% Off',
      description: '10% off your first order, applied to the whole cart.',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      scope: { appliesTo: 'cart', minimumAmount: 50 },
      maxUses: 1000,
      maxUsesPerTenant: 1,
      usedCount: 12,
      status: 'ACTIVE',
      startsAt: daysAgo(7),
      expiresAt: daysFromNow(60),
    },
    {
      // Active fixed-amount, currency-bound, limited to one product line.
      code: 'SAVE25USD',
      name: '$25 Off Laptop',
      description: 'Flat $25 off the seeded test laptop line item.',
      discountType: 'FIXED_AMOUNT',
      discountValue: 25,
      currency: 'USD',
      scope: { appliesTo: 'line', productIds: [productId], minimumAmount: 200 },
      maxUses: 200,
      maxUsesPerTenant: 3,
      usedCount: 4,
      status: 'ACTIVE',
      startsAt: daysAgo(2),
      expiresAt: daysFromNow(30),
    },
    {
      // Plan + category scoped, provider-restricted, currently inactive (paused).
      code: 'PRO50',
      name: 'Pro Plan Half Off',
      description: '50% off the Pro plan when paying via Stripe.',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      scope: {
        appliesTo: 'line',
        planIds: [planProductId],
        categoryIds: [categoryId],
        providers: ['stripe'],
      },
      maxUses: 50,
      usedCount: 0,
      status: 'INACTIVE',
      startsAt: daysFromNow(3),
      expiresAt: daysFromNow(90),
    },
    {
      // Past-window fixed-amount coupon, marked EXPIRED.
      code: 'BLACKFRIDAY',
      name: 'Black Friday €40',
      description: 'Expired seasonal promotion — kept for reporting.',
      discountType: 'FIXED_AMOUNT',
      discountValue: 40,
      currency: 'EUR',
      scope: { appliesTo: 'cart', minimumAmount: 150 },
      maxUses: 500,
      usedCount: 487,
      status: 'EXPIRED',
      startsAt: daysAgo(220),
      expiresAt: daysAgo(190),
    },
    {
      // Retired coupon, ARCHIVED (no scope → applies to all).
      code: 'LEGACY5',
      name: 'Legacy 5% Off',
      description: 'Old blanket discount, archived and no longer offered.',
      discountType: 'PERCENTAGE',
      discountValue: 5,
      usedCount: 31,
      status: 'ARCHIVED',
      startsAt: daysAgo(400),
      expiresAt: daysAgo(120),
    },
  ];

  const couponRepo = ctx.repo<Coupon>(Coupon);
  const couponsByCode: Record<string, Coupon> = {};
  for (const def of couponDefs) {
    couponsByCode[def.code] = await foc(couponRepo,
      { tenantId, code: def.code } as FindOptionsWhere<Coupon>,
      { tenantId, ...def },
    );
  }

  // ── Redemptions (real applications of the active coupons) ────────────────────
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const paymentId = (refs.paymentId as string) ?? 'c0000000-0000-4000-8000-000000000001';

  type RedemptionDef = {
    coupon: Coupon;
    paymentId: string;
    userId?: string;
    discountAmount: number;
    currency: string;
    originalAmount: number;
    finalAmount: number;
    appliedAt: Date;
  };

  const redemptionDefs: RedemptionDef[] = [
    {
      // WELCOME10 → 10% off a $129.90 cart.
      coupon: couponsByCode['WELCOME10'],
      paymentId,
      userId,
      discountAmount: 12.99,
      currency: 'USD',
      originalAmount: 129.9,
      finalAmount: 116.91,
      appliedAt: daysAgo(3),
    },
    {
      // SAVE25USD → flat $25 off a $1299.99 laptop line.
      coupon: couponsByCode['SAVE25USD'],
      paymentId: 'c0000000-0000-4000-8000-000000000002',
      userId,
      discountAmount: 25,
      currency: 'USD',
      originalAmount: 1299.99,
      finalAmount: 1274.99,
      appliedAt: daysAgo(1),
    },
    {
      // BLACKFRIDAY → €40 off a €210 cart, anonymous (no userId).
      coupon: couponsByCode['BLACKFRIDAY'],
      paymentId: 'c0000000-0000-4000-8000-000000000003',
      discountAmount: 40,
      currency: 'EUR',
      originalAmount: 210,
      finalAmount: 170,
      appliedAt: daysAgo(195),
    },
  ];

  const redemptionRepo = ctx.repo<CouponRedemption>(CouponRedemption);
  for (const def of redemptionDefs) {
    await foc(redemptionRepo,
      { tenantId, couponId: def.coupon.couponId, paymentId: def.paymentId } as FindOptionsWhere<CouponRedemption>,
      {
        tenantId,
        couponId: def.coupon.couponId,
        couponCode: def.coupon.code,
        paymentId: def.paymentId,
        userId: def.userId,
        discountAmount: def.discountAmount,
        currency: def.currency,
        originalAmount: def.originalAmount,
        finalAmount: def.finalAmount,
        appliedAt: def.appliedAt,
      },
    );
  }

  // ── Publish references later modules may consume ────────────────────────────
  refs.couponCode = couponsByCode['WELCOME10'].code;
  refs.couponId = couponsByCode['WELCOME10'].couponId;

  ctx.log(`coupon: ${couponDefs.length} coupons, ${redemptionDefs.length} redemptions for ${tenantId}`);
}
