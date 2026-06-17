import { vi } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    SESSION_TTL_SECONDS: 3600,
    REFRESH_TOKEN_TTL_SECONDS: 86400,
  },
}));

vi.mock('@kuraykaraaslan/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@kuraykaraaslan/redis', () => ({
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

vi.mock('@kuraykaraaslan/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@kuraykaraaslan/payment/server/payment.service', () => ({
  default: {
    create: vi.fn(),
    createCheckoutSession: vi.fn(),
    update: vi.fn(),
    getById: vi.fn(),
    markAsCompleted: vi.fn(),
  },
}));

vi.mock('@kuraykaraaslan/audit_log/server/audit_log.service', () => ({
  default: { log: vi.fn(async () => {}) },
}));

vi.mock('@kuraykaraaslan/setting/server/setting.service', () => ({
  default: { getValue: vi.fn(async () => null) },
}));

import { getDataSource, tenantDataSourceFor } from '@kuraykaraaslan/db';

export const PLAN_ID = '00000000-0000-1000-8000-000000000010';
export const FEATURE_ID = '00000000-0000-1000-8000-000000000011';
export const TENANT_ID = '00000000-0000-1000-8001-000000000006';
export const SUB_ID = '00000000-0000-1000-8001-000000000007';
export const PRODUCT_ID = '00000000-0000-1000-8001-000000000099';
const now = new Date();

export const mockProduct = {
  productId: PRODUCT_ID,
  tenantId: TENANT_ID,
  name: 'Basic Plan',
  slug: 'basic-plan',
  basePrice: 9.99,
  currency: 'USD',
  shortDescription: null as string | null,
  status: 'ACTIVE',
};

export const mockPlan = {
  planId: PLAN_ID,
  tenantId: TENANT_ID,
  productId: PRODUCT_ID,
  interval: 'MONTHLY',
  trialDays: 0,
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
};

export const mockFeature = {
  featureId: FEATURE_ID,
  planId: PLAN_ID,
  key: 'feature_chat',
  label: 'Chat',
  type: 'BOOLEAN',
  value: 'true',
  sortOrder: 0,
  createdAt: now,
  updatedAt: now,
};

export const mockSubscription = {
  subscriptionId: SUB_ID,
  tenantId: TENANT_ID,
  planId: PLAN_ID,
  status: 'ACTIVE',
  billingInterval: 'MONTHLY',
  currentPeriodStart: now,
  currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  trialEndsAt: null as Date | null,
  cancelledAt: null,
  gracePeriodEndsAt: null,
  createdAt: now,
  updatedAt: now,
};

function clean(obj: any) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export function makeSystemRepo(planOverride: any = mockPlan, featureOverride: any = mockFeature) {
  return {
    findOne: vi.fn(async ({ where }: any) => {
      if (where?.featureId) return featureOverride;
      if (where?.productId) return mockProduct;
      return planOverride;
    }),
    findBy: vi.fn(async () => [mockProduct]),
    find: vi.fn(async () => [featureOverride]),
    save: vi.fn(async (e: any) => ({ ...mockPlan, ...clean(e) })),
    create: vi.fn((data: any) => ({ ...mockPlan, ...clean(data) })),
    update: vi.fn(async () => ({ affected: 1 })),
    delete: vi.fn(async () => ({ affected: 1 })),
    count: vi.fn(async () => 0),
  };
}

export function makeTenantSubRepo(subOverride: any = mockSubscription) {
  return {
    findOne: vi.fn(async () => subOverride),
    find: vi.fn(async () => [subOverride]),
    save: vi.fn(async (e: any) => ({ ...mockSubscription, ...clean(e) })),
    create: vi.fn((data: any) => ({ ...mockSubscription, ...clean(data) })),
    update: vi.fn(async () => ({ affected: 1 })),
    delete: vi.fn(async () => ({ affected: 1 })),
    count: vi.fn(async () => 0),
    createQueryBuilder: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn(async () => []),
    })),
  };
}

export function mockSystemDs(planOverride?: any, featureOverride?: any) {
  const sysRepo = makeSystemRepo(planOverride, featureOverride);
  (getDataSource as any).mockResolvedValue({ getRepository: () => sysRepo });
  return sysRepo;
}

export function mockTenantDs(subOverride?: any) {
  const subRepo = makeTenantSubRepo(subOverride);
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });
  (getDataSource as any).mockResolvedValue({ getRepository: () => subRepo });
  return subRepo;
}
