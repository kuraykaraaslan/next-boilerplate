import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
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

vi.mock('@/modules/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/modules/payment/payment.service', () => ({
  default: {
    create: vi.fn(),
    createCheckoutSession: vi.fn(),
    update: vi.fn(),
    getById: vi.fn(),
    markAsCompleted: vi.fn(),
  },
}));

vi.mock('@/modules/audit_log/audit_log.service', () => ({
  default: { log: vi.fn(async () => {}) },
}));

vi.mock('@/modules/setting/setting.service', () => ({
  default: { getValue: vi.fn(async () => null) },
}));

import TenantFeatureGateService from '../tenant_subscription.feature.service';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import redis from '@/modules/redis';
import { SUBSCRIPTION_MESSAGES } from '../tenant_subscription.messages';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PLAN_ID = '00000000-0000-1000-8000-000000000010';
const FEATURE_ID = '00000000-0000-1000-8000-000000000011';
const TENANT_ID = '00000000-0000-1000-8001-000000000006';
const SUB_ID = '00000000-0000-1000-8001-000000000007';
const PRODUCT_ID = '00000000-0000-1000-8001-000000000099';
const now = new Date();

const mockProduct = {
  productId: PRODUCT_ID,
  tenantId: TENANT_ID,
  name: 'Basic Plan',
  slug: 'basic-plan',
  basePrice: 9.99,
  currency: 'USD',
  shortDescription: null as string | null,
  status: 'ACTIVE',
};

const mockPlan = {
  planId: PLAN_ID,
  tenantId: TENANT_ID,
  productId: PRODUCT_ID,
  interval: 'MONTHLY',
  trialDays: 0,
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
};

const mockFeature = {
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

const mockSubscription = {
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

// ─── Repo factory helpers ─────────────────────────────────────────────────────

function clean(obj: any) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function makeSystemRepo(planOverride: any = mockPlan, featureOverride: any = mockFeature) {
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

/** Repo that routes by entity name so a single DS can serve Plan + Product + Feature. */
function makeMultiRepo(planOverride: any = mockPlan, productOverride: any = mockProduct) {
  return (entity: any) => {
    const name = entity?.name ?? '';
    if (name === 'StoreProduct') {
      return {
        findOne: vi.fn(async () => productOverride),
        findBy:  vi.fn(async () => productOverride ? [productOverride] : []),
        find:    vi.fn(async () => productOverride ? [productOverride] : []),
      };
    }
    if (name === 'PlanFeature') {
      return {
        findOne: vi.fn(async () => mockFeature),
        find:    vi.fn(async () => [mockFeature]),
        save:    vi.fn(async (e: any) => ({ ...mockFeature, ...clean(e) })),
        create:  vi.fn((data: any) => ({ ...mockFeature, ...clean(data) })),
        update:  vi.fn(async () => ({ affected: 1 })),
        delete:  vi.fn(async () => ({ affected: 1 })),
      };
    }
    return {
      findOne: vi.fn(async () => planOverride),
      findBy:  vi.fn(async () => planOverride ? [planOverride] : []),
      find:    vi.fn(async () => planOverride ? [planOverride] : []),
      save:    vi.fn(async (e: any) => ({ ...mockPlan, ...clean(e) })),
      create:  vi.fn((data: any) => ({ ...mockPlan, ...clean(data) })),
      update:  vi.fn(async () => ({ affected: 1 })),
      delete:  vi.fn(async () => ({ affected: 1 })),
      count:   vi.fn(async () => 0),
    };
  };
}

function makeTenantSubRepo(subOverride: any = mockSubscription) {
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

function mockSystemDs(planOverride?: any, featureOverride?: any) {
  const sysRepo = makeSystemRepo(planOverride, featureOverride);
  (getDataSource as any).mockResolvedValue({ getRepository: () => sysRepo });
  return sysRepo;
}

function mockTenantDs(subOverride?: any) {
  const subRepo = makeTenantSubRepo(subOverride);
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });
  (getDataSource as any).mockResolvedValue({ getRepository: () => subRepo });
  return subRepo;
}

// ─── checkFeatureAccess ───────────────────────────────────────────────────────

describe('TenantFeatureGateService.checkFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns denied when no subscription exists', async () => {
    mockSystemDs();
    const subRepo = makeTenantSubRepo(null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'feature_chat');
    expect(result.allowed).toBe(false);
  });

  it('returns allowed for BOOLEAN feature with value "true"', async () => {
    mockSystemDs();
    mockTenantDs();
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'feature_chat');
    expect(result.allowed).toBe(true);
    expect(result.type).toBe('BOOLEAN');
  });

  it('returns denied for BOOLEAN feature with value "false"', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_export', type: 'BOOLEAN', value: 'false' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'feature_export');
    expect(result.allowed).toBe(false);
  });

  it('returns allowed for LIMIT feature when under limit', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'max_users', type: 'LIMIT', value: '10' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'max_users', 5);
    expect(result.allowed).toBe(true);
    expect(result.type).toBe('LIMIT');
  });

  it('returns denied for LIMIT feature when at or over limit', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'max_users', type: 'LIMIT', value: '10' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'max_users', 10);
    expect(result.allowed).toBe(false);
  });

  it('returns denied when subscription is CANCELLED', async () => {
    const cacheData = {
      status: 'CANCELLED',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'feature_chat');
    expect(result.allowed).toBe(false);
  });

  it('returns denied for unknown feature key', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantFeatureGateService.checkFeatureAccess(TENANT_ID, 'nonexistent_feature');
    expect(result.allowed).toBe(false);
  });
});

// ─── assertFeatureAccess ──────────────────────────────────────────────────────

describe('TenantFeatureGateService.assertFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('throws FEATURE_ACCESS_DENIED when boolean feature is denied', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_export', type: 'BOOLEAN', value: 'false' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    await expect(TenantFeatureGateService.assertFeatureAccess(TENANT_ID, 'feature_export'))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_ACCESS_DENIED);
  });

  it('throws FEATURE_LIMIT_REACHED when limit feature is exceeded', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'max_users', type: 'LIMIT', value: '5' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    await expect(TenantFeatureGateService.assertFeatureAccess(TENANT_ID, 'max_users', 5))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_LIMIT_REACHED);
  });

  it('resolves when feature is allowed', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    await expect(TenantFeatureGateService.assertFeatureAccess(TENANT_ID, 'feature_chat'))
      .resolves.not.toThrow();
  });
});

// ─── invalidateFeatureCache ───────────────────────────────────────────────────

describe('TenantFeatureGateService.invalidateFeatureCache', () => {
  it('calls redis.del with the correct feature cache key', async () => {
    (redis.del as any).mockResolvedValue(1);
    await TenantFeatureGateService.invalidateFeatureCache(TENANT_ID);
    expect(redis.del).toHaveBeenCalledWith(`feature:sub:${TENANT_ID}`);
  });
});
