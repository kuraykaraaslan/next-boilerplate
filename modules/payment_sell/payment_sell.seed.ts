import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ORDER_ID } from '@/modules/seed/seed.context';
import { Payment } from './entities/payment.entity';
import { PaymentTransaction } from './entities/payment_transaction.entity';

/**
 * payment_sell demo seed — follows the store.seed.ts template.
 *
 * Rules of the house:
 *  - Always go through `ctx.foc(repo, where, create)` with a natural key in
 *    `where` so re-runs reuse rows. Neither entity declares a `@Unique`, so we
 *    use the provider-side ids (providerPaymentId / providerTransactionId),
 *    which are unique per provider, as the natural key.
 *  - Use *valid* enum string values copied from payment_sell.enums.ts and
 *    payment_core.enums.ts (provider / method / status / tx type & status).
 *  - Numbers are numbers (decimals are mapped back to `number` by the entity
 *    transformers); never pass stringified amounts.
 *  - `Payment` HAS a `tenantId` column → tenant-scoped (`ctx.repo`).
 *    `PaymentTransaction` has NO `tenantId` column → system-scoped
 *    (`ctx.systemRepo`), so we never set tenantId on it.
 *  - Cover each entity with varied rows (different providers, methods,
 *    statuses, currencies, refunds, failures).
 */
export async function seedPaymentSell(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // Cross-module references are bare uuids (no cross-db FKs). Prefer refs, then
  // fall back to the shared deterministic constants / literals.
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const orderId = (refs.orderId as string) ?? SEED_ORDER_ID;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const minsAfter = (d: Date, n: number) => new Date(d.getTime() + n * 60 * 1000);

  // ── Payments (tenant-scoped) ───────────────────────────────────────────────
  // 1) A successful Stripe credit-card payment, fully captured.
  const paidAt = daysAgo(5);
  const completed = await foc(ctx.repo<Payment>(Payment),
    { tenantId, providerPaymentId: 'pi_test_stripe_completed_0001' } as FindOptionsWhere<Payment>,
    {
      tenantId, userId, provider: 'STRIPE', providerPaymentId: 'pi_test_stripe_completed_0001',
      amount: 1299.99, currency: 'USD', status: 'COMPLETED', paymentMethod: 'CREDIT_CARD',
      description: 'Test Laptop — order checkout',
      metadata: { orderId, source: 'seed', cardBrand: 'visa', last4: '4242' },
      customerEmail: 'buyer@example.com', customerName: 'Alex Buyer', customerPhone: '+1-202-555-0143',
      billingAddress: { line1: '742 Evergreen Terrace', city: 'Springfield', state: 'IL', postalCode: '62704', country: 'US' },
      paidAt, createdAt: paidAt,
    },
  );

  // 2) A PayPal payment that was partially refunded.
  const partialPaidAt = daysAgo(12);
  const partialRefund = await foc(ctx.repo<Payment>(Payment),
    { tenantId, providerPaymentId: 'PAYID-TEST-PARTIAL-0002' } as FindOptionsWhere<Payment>,
    {
      tenantId, userId, provider: 'PAYPAL', providerPaymentId: 'PAYID-TEST-PARTIAL-0002',
      amount: 89.5, currency: 'EUR', status: 'PARTIALLY_REFUNDED', paymentMethod: 'PAYPAL',
      description: 'Accessories bundle — partial return',
      metadata: { orderId, source: 'seed', refundReason: 'one item returned' },
      customerEmail: 'jo@example.de', customerName: 'Jo Müller',
      billingAddress: { line1: 'Hauptstraße 12', city: 'Berlin', postalCode: '10115', country: 'DE' },
      refundedAmount: 29.5, paidAt: partialPaidAt, refundedAt: daysAgo(3), createdAt: partialPaidAt,
    },
  );

  // 3) A failed Iyzico debit-card attempt.
  const failedAt = daysAgo(2);
  const failed = await foc(ctx.repo<Payment>(Payment),
    { tenantId, providerPaymentId: 'iyz_test_failed_0003' } as FindOptionsWhere<Payment>,
    {
      tenantId, userId, provider: 'IYZICO', providerPaymentId: 'iyz_test_failed_0003',
      amount: 459, currency: 'TRY', status: 'FAILED', paymentMethod: 'DEBIT_CARD',
      description: 'Subscription renewal — declined',
      metadata: { orderId, source: 'seed' },
      customerEmail: 'mehmet@example.com.tr', customerName: 'Mehmet Yılmaz', customerPhone: '+90-532-555-0100',
      billingAddress: { line1: 'Atatürk Cd. 5', city: 'İstanbul', postalCode: '34000', country: 'TR' },
      failureCode: 'card_declined', failureMessage: 'Insufficient funds', createdAt: failedAt,
    },
  );

  // 4) A pending Alipay payment awaiting confirmation (expires soon).
  const pendingAt = daysAgo(1);
  const pending = await foc(ctx.repo<Payment>(Payment),
    { tenantId, providerPaymentId: 'ali_test_pending_0004' } as FindOptionsWhere<Payment>,
    {
      tenantId, userId, provider: 'ALIPAY', providerPaymentId: 'ali_test_pending_0004',
      amount: 199, currency: 'CNY', status: 'PENDING', paymentMethod: 'OTHER',
      description: 'Pro Plan — awaiting payment',
      metadata: { orderId, source: 'seed' },
      customerEmail: 'li@example.cn', customerName: 'Li Wei',
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000), createdAt: pendingAt,
    },
  );

  // ── Payment transactions (system-scoped — no tenantId column) ───────────────
  type TxnDef = {
    paymentId: string;
    provider: string;
    providerTransactionId: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    fee?: number;
    net?: number;
    providerResponse?: Record<string, unknown>;
    errorCode?: string;
    errorMessage?: string;
    parentTransactionId?: string;
    ipAddress?: string;
    userAgent?: string;
    processedAt?: Date;
    createdAt?: Date;
  };

  const txnRepo = ctx.systemRepo<PaymentTransaction>(PaymentTransaction);

  // Capture transaction for the completed payment.
  const captureDef: TxnDef = {
    paymentId: completed.paymentId, provider: 'STRIPE', providerTransactionId: 'txn_test_capture_0001',
    type: 'PAYMENT', status: 'COMPLETED', amount: 1299.99, currency: 'USD',
    fee: 38.0, net: 1261.99,
    providerResponse: { balanceTransaction: 'bt_test_0001', captured: true },
    ipAddress: '203.0.113.10',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    processedAt: minsAfter(paidAt, 1), createdAt: paidAt,
  };
  const capture = await foc(txnRepo,
    { paymentId: captureDef.paymentId, provider: captureDef.provider, providerTransactionId: captureDef.providerTransactionId } as FindOptionsWhere<PaymentTransaction>,
    captureDef,
  );

  // Partial refund transaction — a child of the original PayPal payment txn.
  const paypalPaymentTxnDef: TxnDef = {
    paymentId: partialRefund.paymentId, provider: 'PAYPAL', providerTransactionId: 'txn_test_paypal_0002',
    type: 'PAYMENT', status: 'COMPLETED', amount: 89.5, currency: 'EUR',
    fee: 3.4, net: 86.1,
    providerResponse: { saleId: 'SALE-TEST-0002', state: 'completed' },
    processedAt: minsAfter(partialPaidAt, 1), createdAt: partialPaidAt,
  };
  const paypalPaymentTxn = await foc(txnRepo,
    { paymentId: paypalPaymentTxnDef.paymentId, provider: paypalPaymentTxnDef.provider, providerTransactionId: paypalPaymentTxnDef.providerTransactionId } as FindOptionsWhere<PaymentTransaction>,
    paypalPaymentTxnDef,
  );

  const refundDef: TxnDef = {
    paymentId: partialRefund.paymentId, provider: 'PAYPAL', providerTransactionId: 'txn_test_refund_0003',
    type: 'REFUND', status: 'COMPLETED', amount: 29.5, currency: 'EUR',
    fee: 0, net: -29.5,
    providerResponse: { refundId: 'REFUND-TEST-0003', state: 'completed' },
    parentTransactionId: paypalPaymentTxn.transactionId,
    processedAt: daysAgo(3), createdAt: daysAgo(3),
  };
  await foc(txnRepo,
    { paymentId: refundDef.paymentId, provider: refundDef.provider, providerTransactionId: refundDef.providerTransactionId } as FindOptionsWhere<PaymentTransaction>,
    refundDef,
  );

  // Failed attempt transaction for the declined Iyzico payment.
  const failedTxnDef: TxnDef = {
    paymentId: failed.paymentId, provider: 'IYZICO', providerTransactionId: 'txn_test_failed_0004',
    type: 'PAYMENT', status: 'FAILED', amount: 459, currency: 'TRY',
    providerResponse: { errorGroup: 'NOT_SUFFICIENT_FUNDS' },
    errorCode: 'card_declined', errorMessage: 'Insufficient funds',
    ipAddress: '198.51.100.23',
    processedAt: failedAt, createdAt: failedAt,
  };
  await foc(txnRepo,
    { paymentId: failedTxnDef.paymentId, provider: failedTxnDef.provider, providerTransactionId: failedTxnDef.providerTransactionId } as FindOptionsWhere<PaymentTransaction>,
    failedTxnDef,
  );

  // Pending transaction for the awaiting-confirmation Alipay payment.
  const pendingTxnDef: TxnDef = {
    paymentId: pending.paymentId, provider: 'ALIPAY', providerTransactionId: 'txn_test_pending_0005',
    type: 'PAYMENT', status: 'PENDING', amount: 199, currency: 'CNY',
    providerResponse: { tradeStatus: 'WAIT_BUYER_PAY' },
    createdAt: pendingAt,
  };
  await foc(txnRepo,
    { paymentId: pendingTxnDef.paymentId, provider: pendingTxnDef.provider, providerTransactionId: pendingTxnDef.providerTransactionId } as FindOptionsWhere<PaymentTransaction>,
    pendingTxnDef,
  );

  // ── Publish references other modules consume ───────────────────────────────
  refs.paymentId = completed.paymentId;
  refs.transactionId = capture.transactionId;

  ctx.log(`payment_sell: 4 payments, 5 transactions for ${tenantId}`);
}
