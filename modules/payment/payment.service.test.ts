import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '587',
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'test',
    PAYMENT_DEFAULT_PROVIDER: 'STRIPE',
  },
}));

vi.mock('@/modules/db', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  getDefaultTenantDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/modules/redis', () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() },
}));

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    customers: { create: vi.fn(), retrieve: vi.fn() },
    subscriptions: { create: vi.fn(), cancel: vi.fn() },
    paymentIntents: { create: vi.fn(), retrieve: vi.fn() },
  })),
}));

vi.mock('./providers/stripe.provider', () => ({
  default: class MockStripeProvider {
    async getPaymentStatus() { return { status: 'succeeded' }; }
    async createCheckoutSession() {
      return { sessionId: 'cs_test_123', checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123' };
    }
  },
}));

vi.mock('./providers/paypal.provider', () => ({
  default: class MockPaypalProvider {
    async getPaymentStatus() { return { status: 'COMPLETED' }; }
    async createCheckoutSession() {
      return { sessionId: 'pp_order_123', checkoutUrl: 'https://paypal.com/pay/pp_order_123' };
    }
  },
}));

vi.mock('./providers/iyzico.provider', () => ({
  default: class MockIyzicoProvider {
    async getPaymentStatus() { return { status: 'SUCCESS' }; }
    async createCheckoutSession() {
      return { sessionId: 'iyzico_123', checkoutUrl: 'https://sandbox-api.iyzipay.com/pay' };
    }
  },
}));

import PaymentService from './payment.service';
import { getDefaultTenantDataSource, tenantDataSourceFor } from '@/modules/db';
import { PAYMENT_MESSAGES } from './payment.messages';

const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validUuid2 = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

const mockPayment = {
  paymentId: validUuid,
  userId: validUuid2,
  tenantId: null,
  provider: 'STRIPE',
  providerPaymentId: null,
  amount: 99.99,
  currency: 'USD',
  status: 'PENDING',
  paymentMethod: null,
  description: 'Test payment',
  metadata: null,
  customerEmail: 'user@example.com',
  customerName: 'Alice',
  customerPhone: null,
  billingAddress: null,
  refundedAmount: null,
  failureCode: null,
  failureMessage: null,
  paidAt: null,
  cancelledAt: null,
  refundedAt: null,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockTransaction = {
  transactionId: validUuid,
  paymentId: validUuid,
  provider: 'STRIPE',
  providerTransactionId: null,
  type: 'PAYMENT',
  status: 'PENDING',
  amount: 99.99,
  currency: 'USD',
  fee: null,
  net: null,
  providerResponse: null,
  errorCode: null,
  errorMessage: null,
  parentTransactionId: null,
  ipAddress: null,
  userAgent: null,
  processedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePaymentRepo(overrides: Record<string, any> = {}) {
  return {
    findOne: vi.fn(async () => mockPayment),
    find: vi.fn(async () => [mockPayment]),
    // create returns the full mockPayment so save can persist it
    create: vi.fn((_data: any) => ({ ...mockPayment })),
    save: vi.fn(async (_data: any) => ({ ...mockPayment })),
    update: vi.fn(async () => ({ affected: 1 })),
    count: vi.fn(async () => 1),
    ...overrides,
  };
}

function makeTransactionRepo(overrides: Record<string, any> = {}) {
  return {
    findOne: vi.fn(async () => mockTransaction),
    find: vi.fn(async () => [mockTransaction]),
    create: vi.fn((_data: any) => ({ ...mockTransaction })),
    save: vi.fn(async (_data: any) => ({ ...mockTransaction })),
    update: vi.fn(async () => ({ affected: 1 })),
    count: vi.fn(async () => 1),
    ...overrides,
  };
}

function mockDS(paymentRepo?: ReturnType<typeof makePaymentRepo>, txRepo?: ReturnType<typeof makeTransactionRepo>) {
  const pRepo = paymentRepo ?? makePaymentRepo();
  const tRepo = txRepo ?? makeTransactionRepo();
  const ds = {
    getRepository: vi.fn((entity: any) => {
      // Distinguish by entity name
      const name = typeof entity === 'function' ? entity.name : String(entity);
      if (name === 'PaymentTransaction') return tRepo;
      return pRepo;
    }),
  };
  (getDefaultTenantDataSource as any).mockResolvedValue(ds);
  (tenantDataSourceFor as any).mockResolvedValue(ds);
  return { pRepo, tRepo, ds };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PaymentService.getAvailableProviders', () => {
  it('returns STRIPE, PAYPAL, IYZICO', () => {
    const providers = PaymentService.getAvailableProviders();
    expect(providers).toContain('STRIPE');
    expect(providers).toContain('PAYPAL');
    expect(providers).toContain('IYZICO');
  });
});

describe('PaymentService.getDefaultProvider', () => {
  it('returns STRIPE as default', () => {
    expect(PaymentService.getDefaultProvider()).toBe('STRIPE');
  });
});

describe('PaymentService.create', () => {
  it('creates a payment and returns a SafePayment', async () => {
    mockDS();
    const result = await PaymentService.create({
      provider: 'STRIPE',
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.paymentId).toBe(validUuid);
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('throws PAYMENT_CREATE_FAILED when repo save fails', async () => {
    const { ds } = mockDS(makePaymentRepo({
      save: vi.fn(async () => { throw new Error('DB error'); }),
    }));

    await expect(
      PaymentService.create({ provider: 'STRIPE', amount: 50, currency: 'USD' })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_CREATE_FAILED);
  });
});

describe('PaymentService.getById', () => {
  it('returns a SafePayment when payment exists', async () => {
    mockDS();
    const result = await PaymentService.getById(validUuid);
    expect(result.paymentId).toBe(validUuid);
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentService.getById('nonexistent-id')).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});

describe('PaymentService.getByIdWithTransactions', () => {
  it('returns payment with transactions array', async () => {
    mockDS();
    const result = await PaymentService.getByIdWithTransactions(validUuid);
    expect(result.paymentId).toBe(validUuid);
    expect(Array.isArray(result.transactions)).toBe(true);
  });

  it('throws PAYMENT_NOT_FOUND when payment is missing', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentService.getByIdWithTransactions(validUuid)).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});

describe('PaymentService.update', () => {
  it('updates payment status and returns updated SafePayment', async () => {
    const updatedPayment = { ...mockPayment, status: 'COMPLETED', paidAt: new Date() };
    mockDS(makePaymentRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(updatedPayment),
    }));

    const result = await PaymentService.update(validUuid, { status: 'COMPLETED' });
    expect(result.status).toBe('COMPLETED');
  });

  it('throws PAYMENT_NOT_FOUND when updating non-existent payment', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(
      PaymentService.update('nonexistent', { status: 'COMPLETED' })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });
});

describe('PaymentService.delete', () => {
  it('soft-deletes payment without throwing', async () => {
    const { pRepo } = mockDS();
    await expect(PaymentService.delete(validUuid)).resolves.not.toThrow();
    expect(pRepo.update).toHaveBeenCalledWith(
      { paymentId: validUuid },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentService.delete(validUuid)).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});

describe('PaymentService.createTransaction', () => {
  it('creates a transaction when payment exists', async () => {
    mockDS();
    const result = await PaymentService.createTransaction({
      paymentId: validUuid,
      provider: 'STRIPE',
      type: 'PAYMENT',
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.paymentId).toBe(validUuid);
    expect(result.type).toBe('PAYMENT');
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(
      PaymentService.createTransaction({
        paymentId: validUuid,
        provider: 'STRIPE',
        type: 'PAYMENT',
        amount: 50,
        currency: 'USD',
      })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });
});

describe('PaymentService.refund', () => {
  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(
      PaymentService.refund({ paymentId: validUuid })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });

  it('throws REFUND_NOT_ALLOWED when payment status is not COMPLETED', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => ({ ...mockPayment, status: 'PENDING' })) }));
    await expect(
      PaymentService.refund({ paymentId: validUuid })
    ).rejects.toThrow(PAYMENT_MESSAGES.REFUND_NOT_ALLOWED);
  });

  it('throws REFUND_AMOUNT_EXCEEDS_PAYMENT when refund exceeds payment amount', async () => {
    const completedPayment = { ...mockPayment, status: 'COMPLETED', amount: 50, refundedAmount: 0 };
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => completedPayment) }));
    await expect(
      PaymentService.refund({ paymentId: validUuid, amount: 200 })
    ).rejects.toThrow(PAYMENT_MESSAGES.REFUND_AMOUNT_EXCEEDS_PAYMENT);
  });
});

describe('PaymentService.createCheckoutSession', () => {
  it('delegates to the Stripe provider by default', async () => {
    const result = await PaymentService.createCheckoutSession({
      amount: 100,
      currency: 'USD',
      description: 'Test payment',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
    });
    expect(result.sessionId).toBe('cs_test_123');
    expect(result.checkoutUrl).toContain('stripe.com');
  });

  it('delegates to PayPal provider when specified', async () => {
    const result = await PaymentService.createCheckoutSession(
      {
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      },
      'PAYPAL'
    );
    expect(result.sessionId).toBe('pp_order_123');
  });

  it('throws when provider name is invalid', async () => {
    await expect(
      PaymentService.createCheckoutSession(
        { amount: 100, currency: 'USD', description: 'Test', successUrl: '', cancelUrl: '' },
        'UNKNOWN' as any
      )
    ).rejects.toThrow(PAYMENT_MESSAGES.PROVIDER_NOT_FOUND);
  });
});
