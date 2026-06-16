import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@nb/seed/server/seed.context';
import { SEED_USER_ID, SEED_ORDER_ID } from '@nb/seed/server/seed.context';
import { Payment } from './entities/payment.entity';
import { PaymentTransaction } from './entities/payment_transaction.entity';
import { SubscriptionPlan } from './entities/subscription_plan.entity';
import { PlanFeature } from './entities/plan_feature.entity';
import {
  buildPaymentDefs, buildTxDefs, monthlyFeatures, yearlyFeatures, SEED_CAPTURE_TX_ID,
} from './payment.seed.data';

/**
 * Payment module seed (mirrors `store.seed.ts`).
 *
 * Scoping:
 *  - `Payment`, `SubscriptionPlan`, `PlanFeature` carry a `tenantId` column →
 *    tenant-scoped: `ctx.repo<Entity>(Entity)` + `tenantId: ctx.tenantId`.
 *  - `PaymentTransaction` has NO `tenantId` column → system-scoped:
 *    `ctx.systemRepo<Entity>(Entity)`, no tenantId stamped.
 *
 * Rules of the house:
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows instead of duplicating them. Payments key by
 *    `(tenantId, providerPaymentId)`, transactions by `providerTransactionId`,
 *    plans by `(tenantId, productId, interval)`, and features use the entity's
 *    `@Unique(['tenantId', 'planId', 'key'])` constraint.
 *  - Use *valid* enum values only (see `payment.enums.ts`). The concrete row
 *    definitions live in `payment.seed.data.ts`.
 *  - Numbers are numbers; timestamps are real `Date` objects.
 */
export async function seedPayment(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;
  const now = new Date();

  // Cross-module references (bare uuids; no cross-DB FKs).
  const userId = SEED_USER_ID;
  const orderId = SEED_ORDER_ID;
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const planProductId = (refs.planProductId as string) ?? 'a1000000-0000-4000-8000-000000000002';

  // ── Payments (completed card / pending wallet / partially refunded) ─────────
  const paymentRepo = ctx.repo<Payment>(Payment);
  const paymentDefs = buildPaymentDefs(now, { orderId, productId, planProductId });

  const payments: Record<string, Payment> = {};
  for (const def of paymentDefs) {
    payments[def.providerPaymentId] = await foc(paymentRepo,
      { tenantId, providerPaymentId: def.providerPaymentId } as FindOptionsWhere<Payment>,
      { tenantId, userId, ...def },
    );
  }

  const completedPayment = payments['pi_seed_stripe_completed_0001'];
  const refundedPayment = payments['iyz_seed_partial_refund_0003'];

  // ── Payment transactions (system-scoped — no tenantId column) ───────────────
  // Ledger entries hanging off the payments above: a successful capture, the
  // matching refund, and a still-pending capture for the PayPal payment.
  const txRepo = ctx.systemRepo<PaymentTransaction>(PaymentTransaction);
  const txDefs = buildTxDefs(now, {
    completedPaymentId: completedPayment.paymentId,
    refundedPaymentId: refundedPayment.paymentId,
    pendingPaymentId: payments['pp_seed_paypal_pending_0002'].paymentId,
  });

  for (const def of txDefs) {
    // Seed the capture row with a fixed id so the refund's parentTransactionId resolves.
    const create: Record<string, unknown> = { ...def };
    if (def.providerTransactionId === 'txn_seed_capture_0001') create.transactionId = SEED_CAPTURE_TX_ID;
    await foc(txRepo,
      { providerTransactionId: def.providerTransactionId } as FindOptionsWhere<PaymentTransaction>,
      create,
    );
  }

  // ── Subscription plans (monthly active / yearly active w/ trial) ────────────
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const planRepo = ctx.repo<SubscriptionPlan>(SubscriptionPlan);

  const monthlyPlan = await foc(planRepo,
    { tenantId, productId: planProductId, interval: 'MONTHLY' } as FindOptionsWhere<SubscriptionPlan>,
    { tenantId, productId: planProductId, interval: 'MONTHLY', trialDays: 0, status: 'ACTIVE', createdAt: daysAgo(30) },
  );
  const yearlyPlan = await foc(planRepo,
    { tenantId, productId: planProductId, interval: 'YEARLY' } as FindOptionsWhere<SubscriptionPlan>,
    { tenantId, productId: planProductId, interval: 'YEARLY', trialDays: 14, status: 'ACTIVE', createdAt: daysAgo(30) },
  );

  // ── Plan features (composite unique: tenantId + planId + key) ───────────────
  const featureRepo = ctx.repo<PlanFeature>(PlanFeature);
  for (const def of monthlyFeatures) {
    await foc(featureRepo,
      { tenantId, planId: monthlyPlan.planId, key: def.key } as FindOptionsWhere<PlanFeature>,
      { tenantId, planId: monthlyPlan.planId, ...def },
    );
  }
  for (const def of yearlyFeatures) {
    await foc(featureRepo,
      { tenantId, planId: yearlyPlan.planId, key: def.key } as FindOptionsWhere<PlanFeature>,
      { tenantId, planId: yearlyPlan.planId, ...def },
    );
  }

  // ── Publish references other modules consume ────────────────────────────────
  refs.paymentId = completedPayment.paymentId;
  refs.subscriptionPlanId = monthlyPlan.planId;

  ctx.log(`payment: 3 payments, 3 transactions, 2 plans, 7 features for ${tenantId}`);
}
