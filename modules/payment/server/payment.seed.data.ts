/**
 * Static-ish seed data for `payment.seed.ts`. Kept out of the orchestrator so
 * the seed function stays focused on the foc() upsert wiring. The builders take
 * the run's `now` + resolved cross-module ids and return plain definition rows.
 */

export type PaymentDef = {
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

export type TxDef = {
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

export type FeatureDef = { key: string; label: string; type: string; value: string; sortOrder: number };

/** First capture seeds a deterministic id so the refund can point at it as parent. */
export const SEED_CAPTURE_TX_ID = 'e0000000-0000-4000-8000-000000000001';

export function buildPaymentDefs(
  now: Date,
  ids: { orderId: string; productId: string; planProductId: string },
): PaymentDef[] {
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
  const { orderId, productId, planProductId } = ids;

  return [
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
}

export function buildTxDefs(
  now: Date,
  ids: { completedPaymentId: string; refundedPaymentId: string; pendingPaymentId: string },
): TxDef[] {
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  return [
    {
      providerTransactionId: 'txn_seed_capture_0001',
      paymentId: ids.completedPaymentId,
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
      paymentId: ids.refundedPaymentId,
      provider: 'IYZICO',
      type: 'REFUND',
      status: 'COMPLETED',
      amount: 49.5,
      currency: 'TRY',
      fee: 0,
      net: 49.5,
      parentTransactionId: SEED_CAPTURE_TX_ID,
      providerResponse: { refundId: 're_seed_0003', reason: 'requested_by_customer' },
      processedAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
    {
      providerTransactionId: 'txn_seed_pending_0002',
      paymentId: ids.pendingPaymentId,
      provider: 'PAYPAL',
      type: 'PAYMENT',
      status: 'PENDING',
      amount: 29,
      currency: 'EUR',
      providerResponse: { orderId: 'PP-SEED-0002', state: 'CREATED' },
      createdAt: daysAgo(1),
    },
  ];
}

export const monthlyFeatures: FeatureDef[] = [
  { key: 'seats',        label: 'Team Seats',      type: 'LIMIT',   value: '5',     sortOrder: 1 },
  { key: 'storage_gb',   label: 'Storage',         type: 'LIMIT',   value: '50',    sortOrder: 2 },
  { key: 'custom_domain', label: 'Custom Domain',  type: 'BOOLEAN', value: 'false', sortOrder: 3 },
];

export const yearlyFeatures: FeatureDef[] = [
  { key: 'seats',        label: 'Team Seats',      type: 'LIMIT',   value: '25',    sortOrder: 1 },
  { key: 'storage_gb',   label: 'Storage',         type: 'LIMIT',   value: '500',   sortOrder: 2 },
  { key: 'custom_domain', label: 'Custom Domain',  type: 'BOOLEAN', value: 'true',  sortOrder: 3 },
  { key: 'support_tier', label: 'Support Tier',    type: 'BOOLEAN', value: 'true',  sortOrder: 4 },
];
