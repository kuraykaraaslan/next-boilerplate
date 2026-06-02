import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { TenantSubscription } from './entities/tenant_subscription.entity';

/**
 * Demo-data seed for the `tenant_subscription` module.
 *
 * This module owns a single entity, `TenantSubscription`, which records the
 * ONE active billing relationship a tenant has with a plan. The entity is
 * tenant-scoped (`tenantId` column) and carries a `@Unique(['tenantId'])`
 * constraint — a tenant can hold at most one subscription row at a time — so
 * the natural key for `foc` is `tenantId` and there is exactly one meaningful
 * row to seed per tenant (no 2–3 variants are possible without violating the
 * uniqueness constraint).
 *
 * Rules of the house (mirrors `store.seed.ts`):
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse the existing row.
 *  - Use *valid* enum values — status ∈ ACTIVE/PAST_DUE/CANCELLED/EXPIRED/
 *    TRIALING, billingInterval ∈ DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY.
 *  - Timestamps are real JS `Date` objects.
 *  - The `planId` is a cross-module reference (a `payment_subscription` plan
 *    id); read it from `ctx.refs.subscriptionPlanId` with a deterministic
 *    fallback so the seed is self-contained when run in isolation.
 *  - Publish produced ids into `ctx.refs` for later modules.
 */
export async function seedTenantSubscription(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // ── Cross-module references (bare uuids; no cross-DB FKs) ───────────────────
  // The plan lives in the payment_subscription catalogue; fall back to a fixed
  // uuid literal when that seed has not run.
  const planId = (refs.subscriptionPlanId as string) ?? 'c1000000-0000-4000-8000-000000000001';

  // ── Period window: an ACTIVE monthly subscription started ~10 days ago ──────
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;
  const currentPeriodStart = new Date(now.getTime() - 10 * DAY);
  // One month after the period start (clamped naturally by the Date math).
  const currentPeriodEnd = new Date(currentPeriodStart.getTime() + 30 * DAY);
  // Trial wrapped up a couple of days into the period.
  const trialEndsAt = new Date(currentPeriodStart.getTime() + 2 * DAY);

  // ── The tenant's single active subscription ────────────────────────────────
  const subscriptionRepo = ctx.repo<TenantSubscription>(TenantSubscription);
  const subscription = await foc(subscriptionRepo,
    { tenantId } as FindOptionsWhere<TenantSubscription>,
    {
      tenantId,
      planId,
      status: 'ACTIVE',
      billingInterval: 'MONTHLY',
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt,
      // Active and in good standing: no cancellation, no grace period.
      cancelledAt: undefined,
      gracePeriodEndsAt: undefined,
    },
  );

  // ── Publish references later modules might consume ─────────────────────────
  refs.subscriptionId = subscription.subscriptionId;
  refs.subscriptionPlanId ??= subscription.planId;

  ctx.log(`tenant_subscription: 1 active MONTHLY subscription (plan ${planId}) for ${tenantId}`);
}
