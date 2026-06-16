import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@nb/seed/server/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID } from '@nb/seed/server/seed.context';
import { SubscriptionPlan } from './entities/subscription_plan.entity';
import { PlanFeature } from './entities/plan_feature.entity';
import { Subscription } from './entities/subscription.entity';

/**
 * payment_subscription demo seed.
 *
 * Follows the store.seed.ts template:
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows instead of duplicating them.
 *  - Use *valid* enum values only (see payment_subscription.enums.ts):
 *      interval / billingCycle → DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
 *      plan status             → ACTIVE | ARCHIVED | DRAFT
 *      subscription status     → TRIALING | ACTIVE | PAST_DUE | PAUSED | CANCELLED | EXPIRED | INCOMPLETE
 *      feature type            → BOOLEAN | NUMBER | TEXT | LIMIT
 *      provider                → STRIPE | PAYPAL | IYZICO | ALIPAY | WECHATPAY | YOOKASSA | CLOUDPAYMENTS
 *  - Numbers are numbers (the `amount` decimal is mapped back to `number` by the
 *    entity transformer); never pass stringified amounts.
 *  - Every entity here is tenant-scoped (each has a `tenantId` column), so we use
 *    `ctx.repo<Entity>(Entity)` and set `tenantId: ctx.tenantId` on every row.
 */
export async function seedPaymentSubscription(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module references are bare uuids (no cross-table FKs). A subscription
  // plan wraps a StoreProduct; prefer the product the store seed published, else
  // fall back to a fixed deterministic uuid so the seed is self-contained.
  const planProductId = (refs.planProductId as string) ?? 'a1000000-0000-4000-8000-000000000010';
  const altProductId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000011';

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  // ── Plans (monthly active / yearly active w/ trial / quarterly draft) ────────
  type PlanDef = {
    slugKey: string;
    productId: string;
    interval: string;
    trialDays: number;
    status: string;
  };
  const planDefs: PlanDef[] = [
    { slugKey: 'pro-monthly',    productId: planProductId, interval: 'MONTHLY',   trialDays: 14, status: 'ACTIVE' },
    { slugKey: 'pro-yearly',     productId: planProductId, interval: 'YEARLY',    trialDays: 30, status: 'ACTIVE' },
    { slugKey: 'starter-quarterly', productId: altProductId, interval: 'QUARTERLY', trialDays: 0,  status: 'DRAFT' },
  ];
  const plans: Record<string, SubscriptionPlan> = {};
  for (const def of planDefs) {
    plans[def.slugKey] = await foc(ctx.repo<SubscriptionPlan>(SubscriptionPlan),
      { tenantId, productId: def.productId, interval: def.interval } as FindOptionsWhere<SubscriptionPlan>,
      { tenantId, productId: def.productId, interval: def.interval, trialDays: def.trialDays, status: def.status },
    );
  }
  const monthlyPlan = plans['pro-monthly'];
  const yearlyPlan = plans['pro-yearly'];
  const draftPlan = plans['starter-quarterly'];

  // ── Plan features (canonical 2-type model: BOOLEAN flag / LIMIT quota) ───────
  type FeatureDef = { planId: string; key: string; label: string; type: string; value: string; sortOrder: number };
  const featureDefs: FeatureDef[] = [
    // Pro Monthly feature set
    { planId: monthlyPlan.planId, key: 'priority_support',  label: 'Priority Support',  type: 'BOOLEAN', value: 'true', sortOrder: 1 },
    { planId: monthlyPlan.planId, key: 'seats',             label: 'Team Seats',        type: 'LIMIT',   value: '5',    sortOrder: 2 },
    { planId: monthlyPlan.planId, key: 'storage_gb',        label: 'Storage',           type: 'LIMIT',   value: '100',  sortOrder: 3 },
    // Pro Yearly feature set (richer)
    { planId: yearlyPlan.planId,  key: 'priority_support',  label: 'Priority Support',  type: 'BOOLEAN', value: 'true', sortOrder: 1 },
    { planId: yearlyPlan.planId,  key: 'seats',             label: 'Team Seats',        type: 'LIMIT',   value: '25',   sortOrder: 2 },
    { planId: yearlyPlan.planId,  key: 'sla',               label: 'Support SLA',       type: 'BOOLEAN', value: 'true', sortOrder: 3 },
    // Starter Quarterly feature set (limited)
    { planId: draftPlan.planId,   key: 'seats',             label: 'Team Seats',        type: 'LIMIT',   value: '1',    sortOrder: 1 },
    { planId: draftPlan.planId,   key: 'priority_support',  label: 'Priority Support',  type: 'BOOLEAN', value: 'false', sortOrder: 2 },
  ];
  for (const def of featureDefs) {
    await foc(ctx.repo<PlanFeature>(PlanFeature),
      { tenantId, planId: def.planId, key: def.key } as FindOptionsWhere<PlanFeature>,
      { tenantId, planId: def.planId, key: def.key, label: def.label, type: def.type, value: def.value, sortOrder: def.sortOrder },
    );
  }

  // ── Subscriptions (active Stripe / trialing PayPal / cancelled Iyzico) ───────
  type SubDef = {
    refKey: string;
    userId: string;
    planId: string;
    provider: string;
    providerSubscriptionId: string;
    providerCustomerId: string;
    status: string;
    billingCycle: string;
    amount: number;
    currency: string;
    trialEndsAt?: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
    cancelAtPeriodEnd: boolean;
    pausedAt?: Date;
    pausedUntil?: Date;
    pastDueCount?: number;
    metadata?: Record<string, unknown>;
  };
  const subDefs: SubDef[] = [
    {
      refKey: 'active',
      userId: SEED_USER_ID,
      planId: monthlyPlan.planId,
      provider: 'STRIPE',
      providerSubscriptionId: 'sub_seed_active_001',
      providerCustomerId: 'cus_seed_001',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      amount: 29.0,
      currency: 'USD',
      currentPeriodStart: daysAgo(3),
      currentPeriodEnd: daysFromNow(27),
      cancelAtPeriodEnd: false,
      metadata: { source: 'seed', tier: 'pro' },
    },
    {
      refKey: 'trialing',
      userId: SEED_ADMIN_USER_ID,
      planId: yearlyPlan.planId,
      provider: 'PAYPAL',
      providerSubscriptionId: 'I-SEEDTRIAL002',
      providerCustomerId: 'paypal_cust_002',
      status: 'TRIALING',
      billingCycle: 'YEARLY',
      amount: 290.0,
      currency: 'EUR',
      trialEndsAt: daysFromNow(30),
      currentPeriodStart: now,
      currentPeriodEnd: daysFromNow(365),
      cancelAtPeriodEnd: false,
      metadata: { source: 'seed', tier: 'pro', trial: true },
    },
    {
      refKey: 'cancelled',
      userId: SEED_USER_ID,
      planId: draftPlan.planId,
      provider: 'IYZICO',
      providerSubscriptionId: 'sub_seed_cancelled_003',
      providerCustomerId: 'iyz_cust_003',
      status: 'CANCELLED',
      billingCycle: 'QUARTERLY',
      amount: 75.0,
      currency: 'TRY',
      currentPeriodStart: daysAgo(60),
      currentPeriodEnd: daysAgo(30),
      cancelledAt: daysAgo(28),
      cancellationReason: 'Downgraded to free plan',
      cancelAtPeriodEnd: true,
      pastDueCount: 1,
      metadata: { source: 'seed', tier: 'starter' },
    },
  ];
  const subscriptions: Record<string, Subscription> = {};
  for (const def of subDefs) {
    const { refKey, ...row } = def;
    subscriptions[refKey] = await foc(ctx.repo<Subscription>(Subscription),
      { tenantId, providerSubscriptionId: def.providerSubscriptionId } as FindOptionsWhere<Subscription>,
      { tenantId, ...row },
    );
  }

  // ── Publish references later modules might consume ───────────────────────────
  refs.subscriptionPlanId = monthlyPlan.planId;
  refs.subscriptionId = subscriptions['active'].subscriptionId;

  ctx.log(`payment_subscription: 3 plans, ${featureDefs.length} features, 3 subscriptions for ${tenantId}`);
}
