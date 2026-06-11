import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '587',
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'test',
    PAYMENT_DEFAULT_PROVIDER: 'STRIPE',
  },
}));

vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@/modules/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    ping: vi.fn(async () => 'PONG'),
    mget: vi.fn(async () => []),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
  },
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));

vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import PaymentCrudService from '../payment.crud.service';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { PAYMENT_MESSAGES } from '../payment.messages';

const validUuid  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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
      const name = typeof entity === 'function' ? entity.name : String(entity);
      if (name === 'PaymentTransaction') return tRepo;
      return pRepo;
    }),
  };
  (getDataSource as any).mockResolvedValue(ds);
  (tenantDataSourceFor as any).mockResolvedValue(ds);
  return { pRepo, tRepo, ds };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PaymentCrudService.create', () => {
  it('creates a payment and returns a SafePayment', async () => {
    mockDS();
    const result = await PaymentCrudService.create({
      provider: 'STRIPE',
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.paymentId).toBe(validUuid);
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('throws PAYMENT_CREATE_FAILED when repo save fails', async () => {
    mockDS(makePaymentRepo({
      save: vi.fn(async () => { throw new Error('DB error'); }),
    }));

    await expect(
      PaymentCrudService.create({ provider: 'STRIPE', amount: 50, currency: 'USD' })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_CREATE_FAILED);
  });
});

describe('PaymentCrudService.getById', () => {
  it('returns a SafePayment when payment exists', async () => {
    mockDS();
    const result = await PaymentCrudService.getById(validUuid);
    expect(result.paymentId).toBe(validUuid);
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentCrudService.getById('nonexistent-id')).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});

describe('PaymentCrudService.getByIdWithTransactions', () => {
  it('returns payment with transactions array', async () => {
    mockDS();
    const result = await PaymentCrudService.getByIdWithTransactions(validUuid);
    expect(result.paymentId).toBe(validUuid);
    expect(Array.isArray(result.transactions)).toBe(true);
  });

  it('throws PAYMENT_NOT_FOUND when payment is missing', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentCrudService.getByIdWithTransactions(validUuid)).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});

describe('PaymentCrudService.update', () => {
  it('updates payment status and returns updated SafePayment', async () => {
    const updatedPayment = { ...mockPayment, status: 'COMPLETED', paidAt: new Date() };
    mockDS(makePaymentRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce(updatedPayment),
    }));

    const result = await PaymentCrudService.update(validUuid, { status: 'COMPLETED' });
    expect(result.status).toBe('COMPLETED');
  });

  it('throws PAYMENT_NOT_FOUND when updating non-existent payment', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(
      PaymentCrudService.update('nonexistent', { status: 'COMPLETED' })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });
});

describe('PaymentCrudService.delete', () => {
  it('soft-deletes payment without throwing', async () => {
    const { pRepo } = mockDS();
    await expect(PaymentCrudService.delete(validUuid)).resolves.not.toThrow();
    expect(pRepo.update).toHaveBeenCalledWith(
      { paymentId: validUuid },
      expect.objectContaining({ deletedAt: expect.any(Date) })
    );
  });

  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(PaymentCrudService.delete(validUuid)).rejects.toThrow(
      PAYMENT_MESSAGES.PAYMENT_NOT_FOUND
    );
  });
});

describe('PaymentCrudService.createTransaction', () => {
  it('creates a transaction when payment exists', async () => {
    mockDS();
    const result = await PaymentCrudService.createTransaction({
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
      PaymentCrudService.createTransaction({
        paymentId: validUuid,
        provider: 'STRIPE',
        type: 'PAYMENT',
        amount: 50,
        currency: 'USD',
      })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });
});

describe('PaymentCrudService.refund', () => {
  it('throws PAYMENT_NOT_FOUND when payment does not exist', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => null) }));
    await expect(
      PaymentCrudService.refund({ paymentId: validUuid })
    ).rejects.toThrow(PAYMENT_MESSAGES.PAYMENT_NOT_FOUND);
  });

  it('throws REFUND_NOT_ALLOWED when payment status is not COMPLETED', async () => {
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => ({ ...mockPayment, status: 'PENDING' })) }));
    await expect(
      PaymentCrudService.refund({ paymentId: validUuid })
    ).rejects.toThrow(PAYMENT_MESSAGES.REFUND_NOT_ALLOWED);
  });

  it('throws REFUND_AMOUNT_EXCEEDS_PAYMENT when refund exceeds payment amount', async () => {
    const completedPayment = { ...mockPayment, status: 'COMPLETED', amount: 50, refundedAmount: 0 };
    mockDS(makePaymentRepo({ findOne: vi.fn(async () => completedPayment) }));
    await expect(
      PaymentCrudService.refund({ paymentId: validUuid, amount: 200 })
    ).rejects.toThrow(PAYMENT_MESSAGES.REFUND_AMOUNT_EXCEEDS_PAYMENT);
  });
});
