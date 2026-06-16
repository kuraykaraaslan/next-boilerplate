import { vi } from 'vitest';

vi.mock('@nb/env', () => ({
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

vi.mock('@nb/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@nb/redis', () => ({
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

vi.mock('@nb/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { getDataSource, tenantDataSourceFor } from '@nb/db';

export const validUuid  = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
export const validUuid2 = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

export const mockPayment = {
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

export const mockTransaction = {
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

export function makePaymentRepo(overrides: Record<string, any> = {}) {
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

export function makeTransactionRepo(overrides: Record<string, any> = {}) {
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

export function mockDS(paymentRepo?: ReturnType<typeof makePaymentRepo>, txRepo?: ReturnType<typeof makeTransactionRepo>) {
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
