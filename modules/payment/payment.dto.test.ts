import { describe, it, expect } from 'vitest';
import {
  CreatePaymentRequestSchema,
  UpdatePaymentRequestSchema,
  GetPaymentsQuerySchema,
  GetProviderStatusRequestSchema,
  CreateTransactionRequestSchema,
  UpdateTransactionRequestSchema,
  GetTransactionsQuerySchema,
  RefundPaymentRequestSchema,
} from './payment.dto';

const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('CreatePaymentRequestSchema', () => {
  it('accepts valid payment creation data', () => {
    const result = CreatePaymentRequestSchema.safeParse({
      provider: 'STRIPE',
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full optional fields', () => {
    const result = CreatePaymentRequestSchema.safeParse({
      userId: validUuid,
      tenantId: validUuid,
      provider: 'PAYPAL',
      amount: 200,
      currency: 'EUR',
      paymentMethod: 'CREDIT_CARD',
      description: 'Test payment',
      customerEmail: 'user@example.com',
      customerName: 'Alice Smith',
      customerPhone: '+12025551234',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when provider is missing', () => {
    const result = CreatePaymentRequestSchema.safeParse({ amount: 50, currency: 'USD' });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = CreatePaymentRequestSchema.safeParse({
      provider: 'STRIPE',
      amount: -10,
      currency: 'USD',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/positive/i);
    }
  });

  it('rejects zero amount', () => {
    const result = CreatePaymentRequestSchema.safeParse({
      provider: 'STRIPE',
      amount: 0,
      currency: 'USD',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid provider', () => {
    const result = CreatePaymentRequestSchema.safeParse({
      provider: 'INVALID_PROVIDER',
      amount: 50,
      currency: 'USD',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid customer email', () => {
    const result = CreatePaymentRequestSchema.safeParse({
      provider: 'STRIPE',
      amount: 50,
      currency: 'USD',
      customerEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdatePaymentRequestSchema', () => {
  it('accepts empty update (all fields optional)', () => {
    const result = UpdatePaymentRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status update', () => {
    const result = UpdatePaymentRequestSchema.safeParse({ status: 'COMPLETED' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = UpdatePaymentRequestSchema.safeParse({ status: 'UNKNOWN_STATUS' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid customer email in update', () => {
    const result = UpdatePaymentRequestSchema.safeParse({ customerEmail: 'bad-email' });
    expect(result.success).toBe(false);
  });
});

describe('GetPaymentsQuerySchema', () => {
  it('accepts empty query with defaults', () => {
    const result = GetPaymentsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(0);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('accepts valid pagination and filters', () => {
    const result = GetPaymentsQuerySchema.safeParse({
      page: 2,
      pageSize: 25,
      provider: 'STRIPE',
      status: 'PENDING',
      currency: 'USD',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative page', () => {
    const result = GetPaymentsQuerySchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects pageSize exceeding 100', () => {
    const result = GetPaymentsQuerySchema.safeParse({ pageSize: 101 });
    expect(result.success).toBe(false);
  });
});

describe('GetProviderStatusRequestSchema', () => {
  it('accepts a valid token', () => {
    const result = GetProviderStatusRequestSchema.safeParse({ token: 'stripe_token_123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty token', () => {
    const result = GetProviderStatusRequestSchema.safeParse({ token: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/required/i);
    }
  });

  it('accepts with optional provider', () => {
    const result = GetProviderStatusRequestSchema.safeParse({
      token: 'stripe_token_123',
      provider: 'STRIPE',
    });
    expect(result.success).toBe(true);
  });
});

describe('CreateTransactionRequestSchema', () => {
  it('accepts valid transaction creation data', () => {
    const result = CreateTransactionRequestSchema.safeParse({
      paymentId: validUuid,
      provider: 'STRIPE',
      type: 'PAYMENT',
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when paymentId is not a UUID', () => {
    const result = CreateTransactionRequestSchema.safeParse({
      paymentId: 'not-a-uuid',
      provider: 'STRIPE',
      type: 'PAYMENT',
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = CreateTransactionRequestSchema.safeParse({
      paymentId: validUuid,
      provider: 'STRIPE',
      type: 'PAYMENT',
      amount: -10,
      currency: 'USD',
    });
    expect(result.success).toBe(false);
  });

  it('accepts REFUND transaction type', () => {
    const result = CreateTransactionRequestSchema.safeParse({
      paymentId: validUuid,
      provider: 'PAYPAL',
      type: 'REFUND',
      amount: 50,
      currency: 'EUR',
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateTransactionRequestSchema', () => {
  it('accepts empty update', () => {
    expect(UpdateTransactionRequestSchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid status update', () => {
    const result = UpdateTransactionRequestSchema.safeParse({ status: 'COMPLETED' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid transaction status', () => {
    const result = UpdateTransactionRequestSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('GetTransactionsQuerySchema', () => {
  it('applies defaults for page and pageSize', () => {
    const result = GetTransactionsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(0);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it('accepts all filter fields', () => {
    const result = GetTransactionsQuerySchema.safeParse({
      paymentId: validUuid,
      provider: 'IYZICO',
      type: 'CHARGEBACK',
      status: 'FAILED',
    });
    expect(result.success).toBe(true);
  });
});

describe('RefundPaymentRequestSchema', () => {
  it('accepts a valid refund request with paymentId only', () => {
    const result = RefundPaymentRequestSchema.safeParse({ paymentId: validUuid });
    expect(result.success).toBe(true);
  });

  it('accepts refund with partial amount', () => {
    const result = RefundPaymentRequestSchema.safeParse({
      paymentId: validUuid,
      amount: 25.0,
      reason: 'Customer request',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when paymentId is not a UUID', () => {
    const result = RefundPaymentRequestSchema.safeParse({ paymentId: 'bad-id' });
    expect(result.success).toBe(false);
  });

  it('rejects negative refund amount', () => {
    const result = RefundPaymentRequestSchema.safeParse({
      paymentId: validUuid,
      amount: -5,
    });
    expect(result.success).toBe(false);
  });
});
