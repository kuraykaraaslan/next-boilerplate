import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ORDER_ID } from '@/modules/seed/seed.context';
import { Payment } from './entities/payment.entity';
import { PaymentTransaction } from './entities/payment_transaction.entity';
import { SubscriptionPlan } from './entities/subscription_plan.entity';
import { PlanFeature } from './entities/plan_feature.entity';

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
 *  - Use *valid* enum values only (see `payment.enums.ts`):
 *      provider      : STRIPE | PAYPAL | IYZICO | ALIPAY | WECHATPAY | YOOKASSA | CLOUDPAYMENTS
 *      paymentStatus : PENDING | PROCESSING | COMPLETED | FAILED | REFUNDED | PARTIALLY_REFUNDED | CANCELLED | EXPIRED
 *      paymentMethod : CREDIT_CARD | DEBIT_CARD | BANK_TRANSFER | PAYPAL | APPLE_PAY | GOOGLE_PAY | OTHER
 *      txType        : PAYMENT | REFUND | CHARGEBACK | PAYOUT
 *      txStatus      : PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED
 *      plan interval : DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
 *  - Numbers are numbers (decimals are mapped back to `number` by the entity
 *    transformers); never pass stringified amounts.
 *  - Timestamps are real `Date` objects.
 *  - Cross-module ids (user / order / product) are bare uuids — read from
 *    `ctx.refs` when present, else fall back to a deterministic literal.
 */
export async function seedPayment(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  // Cross-module references (bare uuids; no cross-DB FKs).
  const userId = SEED_USER_ID;
  const orderId = SEED_ORDER_ID;
  const productId = (refs.productId as string) ?? 'a1000000-0000-4000-8000-000000000001';
  const planProductId = (refs.planProductId as string) ?? 'a1000000-0000-4000-8000-000000000002';

  // ── Payments (completed card / pending wallet / partially refunded) ─────────
  const paymentRepo = ctx.repo<Payment>(Payment);

  type PaymentDef = {
    providerPaymentId: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    description: string;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    billingAddress: Record<string, string>;
    metadata: Record<string, unknown>;
    refundedAmount?: number;
    failureCode?: string;
    failureMessage?: string;
    paidAt?: Date;
    cancelledAt?: Date;
    refundedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
  };

  const paymentDefs: PaymentDef[] = [
    {
      providerPaymentId: 'pi_seed_stripe_completed_0001',
      provider: 'STRIPE',
      amount: 1299.99,
      currency: 'USD',
      status: 'COMPLETED',
      paymentMethod: 'CREDIT_CARD',
      description: 'Test Laptop — one-time purchase',
      customerEmail: 'buyer@example.com',
      customerName: 'Ada Lovelace',
      customerPhone: '+15551230001',
      billingAddress: { line1: '1 Analytical Engine Way', city: 'London', state: 'LDN', postalCode: 'EC1A 1BB', country: 'GB' },
      metadata: { orderId, source: 'seed', channel: 'web' },
      paidAt: daysAgo(7),
      createdAt: daysAgo(7),
    },
    {
      providerPaymentId: 'pp_seed_paypal_pending_0002',
      provider: 'PAYPAL',
      amount: 29,
      currency: 'EUR',
      status: 'PENDING',
      paymentMethod: 'PAYPAL',
      description: 'Pro Plan — first month',
      customerEmail: 'pending@example.com',
      customerName: 'Grace Hopper',
      billingAddress: { line1: 'Navy Yard 42', city: 'Arlington', state: 'VA', postalCode: '22202', country: 'US' },
      metadata: { planProductId, source: 'seed', channel: 'checkout' },
      expiresAt: daysFromNow(1),
      createdAt: daysAgo(1),
    },
    {
      providerPaymentId: 'iyz_seed_partial_refund_0003',
      provider: 'IYZICO',
      amount: 199.5,
      currency: 'TRY',
      status: 'PARTIALLY_REFUNDED',
      paymentMethod: 'DEBIT_CARD',
      description: 'Accessories bundle — partial refund issued',
      customerEmail: 'refund@example.com.tr',
      customerName: 'Cahit Arf',
      customerPhone: '+905551230003',
      billingAddress: { line1: 'Atatürk Cd. 7', city: 'İzmir', state: 'İzmir', postalCode: '35000', country: 'TR' },
      metadata: { productId, source: 'seed', channel: 'web' },
      refundedAmount: 49.5,
      paidAt: daysAgo(20),
      refundedAt: daysAgo(3),
      createdAt: daysAgo(20),
    },
  ];

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

  type TxDef = {
    providerTransactionId: string;
    paymentId: string;
    provider: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    fee?: number;
    net?: number;
    parentTransactionId?: string;
    providerResponse: Record<string, unknown>;
    errorCode?: string;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    processedAt?: Date;
    createdAt: Date;
  };

  // First capture seeds a deterministic id so the refund can point at it as parent.
  const captureTxId = 'e0000000-0000-4000-8000-000000000001';

  const txDefs: TxDef[] = [
    {
      providerTransactionId: 'txn_seed_capture_0001',
      paymentId: completedPayment.paymentId,
      provider: 'STRIPE',
      type: 'PAYMENT',
      status: 'COMPLETED',
      amount: 1299.99,
      currency: 'USD',
      fee: 38.0,
      net: 1261.99,
      providerResponse: { id: 'ch_seed_0001', captured: true, network: 'visa' },
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) seed',
      processedAt: daysAgo(7),
      createdAt: daysAgo(7),
    },
    {
      providerTransactionId: 'txn_seed_refund_0003',
      paymentId: refundedPayment.paymentId,
      provider: 'IYZICO',
      type: 'REFUND',
      status: 'COMPLETED',
      amount: 49.5,
      currency: 'TRY',
      fee: 0,
      net: 49.5,
      parentTransactionId: captureTxId,
      providerResponse: { refundId: 're_seed_0003', reason: 'requested_by_customer' },
      processedAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
    {
      providerTransactionId: 'txn_seed_pending_0002',
      paymentId: payments['pp_seed_paypal_pending_0002'].paymentId,
      provider: 'PAYPAL',
      type: 'PAYMENT',
      status: 'PENDING',
      amount: 29,
      currency: 'EUR',
      providerResponse: { orderId: 'PP-SEED-0002', state: 'CREATED' },
      createdAt: daysAgo(1),
    },
  ];

  for (const def of txDefs) {
    // Seed the capture row with a fixed id so the refund's parentTransactionId resolves.
    const create: Record<string, unknown> = { ...def };
    if (def.providerTransactionId === 'txn_seed_capture_0001') create.transactionId = captureTxId;
    await foc(txRepo,
      { providerTransactionId: def.providerTransactionId } as FindOptionsWhere<PaymentTransaction>,
      create,
    );
  }

  // ── Subscription plans (monthly active / yearly active w/ trial) ────────────
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
  type FeatureDef = { key: string; label: string; type: string; value: string; sortOrder: number };
  const monthlyFeatures: FeatureDef[] = [
    { key: 'seats',        label: 'Team Seats',      type: 'NUMBER',  value: '5',     sortOrder: 1 },
    { key: 'storage_gb',   label: 'Storage',         type: 'NUMBER',  value: '50',    sortOrder: 2 },
    { key: 'custom_domain', label: 'Custom Domain',  type: 'BOOLEAN', value: 'false', sortOrder: 3 },
  ];
  const yearlyFeatures: FeatureDef[] = [
    { key: 'seats',        label: 'Team Seats',      type: 'NUMBER',  value: '25',    sortOrder: 1 },
    { key: 'storage_gb',   label: 'Storage',         type: 'NUMBER',  value: '500',   sortOrder: 2 },
    { key: 'custom_domain', label: 'Custom Domain',  type: 'BOOLEAN', value: 'true',  sortOrder: 3 },
    { key: 'support_tier', label: 'Support Tier',    type: 'TEXT',    value: 'priority', sortOrder: 4 },
  ];

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
