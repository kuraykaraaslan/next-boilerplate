import { vi } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
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
vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@kuraykaraaslan/tenant_member/server/tenant_member.service', () => ({
  default: { create: vi.fn() },
}));

vi.mock('@kuraykaraaslan/tenant_subscription/server/tenant_subscription.service', () => ({
  default: {
    assignPlan: vi.fn(async () => ({})),
  },
}));

vi.mock('@kuraykaraaslan/tenant_subscription/server/tenant_subscription.platform.service', () => ({
  default: {
    assignPlatformPlan: vi.fn(async () => ({})),
  },
}));

vi.mock('@kuraykaraaslan/tenant_subscription/server/tenant_subscription.plan.service', () => ({
  default: {
    createPlan: vi.fn(async () => ({
      planId: '11111111-1111-4111-8111-111111111111',
      tenantId: 'mock-tenant',
      productId: '22222222-2222-4222-8222-222222222222',
      interval: 'MONTHLY',
      trialDays: 0,
      status: 'ACTIVE',
    })),
  },
}));

vi.mock('@kuraykaraaslan/tenant_subscription/server/tenant_subscription.feature.service', () => ({
  default: {
    getDefaultPlanId: vi.fn(async () => null),
  },
}));

vi.mock('@kuraykaraaslan/setting/server/setting.service', () => ({
  default: {
    updateMany: vi.fn(async () => []),
  },
}));

import { tenantDataSourceFor, getDataSource } from '@kuraykaraaslan/db';

export const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';

export const mockTenant = {
  tenantId: TENANT_ID,
  name: 'Test Tenant',
  description: 'A test tenant',
  tenantStatus: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  domains: null,
};

export function makeRepo(overrides: Partial<{
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    findOne: vi.fn(async () => mockTenant),
    find: vi.fn(async () => [mockTenant]),
    count: vi.fn(async () => 1),
    create: vi.fn((data: any) => ({ ...mockTenant, ...data })),
    save: vi.fn(async (entity: any) => ({ ...mockTenant, ...entity })),
    update: vi.fn(async () => ({ affected: 1 })),
    ...overrides,
  };
}

export function mockDefaultDs(repo: ReturnType<typeof makeRepo>) {
  (getDataSource as any).mockResolvedValue({ getRepository: () => repo });
}

export function mockTenantDs(repo: ReturnType<typeof makeRepo>) {
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
}
