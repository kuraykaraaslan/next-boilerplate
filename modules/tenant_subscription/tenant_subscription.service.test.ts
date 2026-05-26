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

import TenantSubscriptionService from './tenant_subscription.service';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import redis from '@/modules/redis';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';

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

// ─── Plan CRUD ────────────────────────────────────────────────────────────────

describe('TenantSubscriptionService.createPlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and returns a plan with product embedded', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo() });
    const result = await TenantSubscriptionService.createPlan(TENANT_ID, {
      productId: PRODUCT_ID,
      interval: 'MONTHLY',
      trialDays: 0,
      status: 'ACTIVE',
    });
    expect(result.productId).toBe(PRODUCT_ID);
    expect(result.interval).toBe('MONTHLY');
    expect(result.product.name).toBe('Basic Plan');
  });
});

describe('TenantSubscriptionService.updatePlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND when plan does not exist', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo(null) });
    await expect(TenantSubscriptionService.updatePlan(TENANT_ID, PLAN_ID, { interval: 'YEARLY' }))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
  });

  it('returns updated plan with product', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo() });
    const result = await TenantSubscriptionService.updatePlan(TENANT_ID, PLAN_ID, { interval: 'YEARLY' });
    expect(result.product.name).toBe('Basic Plan');
    expect(result.productId).toBe(PRODUCT_ID);
  });
});

describe('TenantSubscriptionService.deletePlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND when plan does not exist', async () => {
    const sysRepo = makeSystemRepo(null);
    (getDataSource as any).mockResolvedValue({ getRepository: () => sysRepo });
    await expect(TenantSubscriptionService.deletePlan(TENANT_ID, PLAN_ID))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
  });

  it('throws PLAN_HAS_SUBSCRIPTIONS when active subscriptions exist', async () => {
    mockSystemDs();
    const subRepo = makeTenantSubRepo();
    subRepo.count = vi.fn(async () => 1);
    (getDataSource as any).mockResolvedValue({ getRepository: () => subRepo });

    await expect(TenantSubscriptionService.deletePlan(TENANT_ID, PLAN_ID))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_HAS_SUBSCRIPTIONS);
  });

  it('deletes the plan when no active subscriptions exist', async () => {
    const sysRepo = mockSystemDs();
    const subRepo = makeTenantSubRepo();
    subRepo.count = vi.fn(async () => 0);
    (getDataSource as any).mockResolvedValue({ getRepository: () => subRepo });

    await expect(TenantSubscriptionService.deletePlan(TENANT_ID, PLAN_ID)).resolves.toBeUndefined();
    expect(sysRepo.delete).toHaveBeenCalled();
  });
});

describe('TenantSubscriptionService.getPlanById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND for unknown planId', async () => {
    mockSystemDs(null);
    await expect(TenantSubscriptionService.getPlanById(TENANT_ID, 'unknown-id'))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
  });

  it('returns the plan', async () => {
    mockSystemDs();
    const result = await TenantSubscriptionService.getPlanById(TENANT_ID, PLAN_ID);
    expect(result.planId).toBe(PLAN_ID);
  });
});

// ─── Feature CRUD ─────────────────────────────────────────────────────────────

describe('TenantSubscriptionService.addFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND when plan does not exist', async () => {
    mockSystemDs(null);
    await expect(
      TenantSubscriptionService.addFeature(TENANT_ID, PLAN_ID, {
        key: 'f1',
        label: 'F1',
        type: 'BOOLEAN',
        value: 'true',
        sortOrder: 0,
      })
    ).rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
  });

  it('creates and returns a feature', async () => {
    const sysRepo = makeSystemRepo();
    sysRepo.save = vi.fn(async (e: any) => ({ ...mockFeature, ...e }));
    (getDataSource as any).mockResolvedValue({ getRepository: () => sysRepo });

    const result = await TenantSubscriptionService.addFeature(TENANT_ID, PLAN_ID, {
      key: 'feature_chat',
      label: 'Chat',
      type: 'BOOLEAN',
      value: 'true',
      sortOrder: 0,
    });
    expect(result.key).toBe('feature_chat');
  });
});

describe('TenantSubscriptionService.updateFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FEATURE_NOT_FOUND when feature does not exist', async () => {
    const sysRepo = makeSystemRepo(mockPlan, null);
    (getDataSource as any).mockResolvedValue({ getRepository: () => sysRepo });
    await expect(TenantSubscriptionService.updateFeature(TENANT_ID, FEATURE_ID, { label: 'New' }))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND);
  });
});

describe('TenantSubscriptionService.removeFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FEATURE_NOT_FOUND when feature does not exist', async () => {
    const sysRepo = makeSystemRepo(mockPlan, null);
    (getDataSource as any).mockResolvedValue({ getRepository: () => sysRepo });
    await expect(TenantSubscriptionService.removeFeature(TENANT_ID, FEATURE_ID))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND);
  });

  it('deletes the feature successfully', async () => {
    const sysRepo = makeSystemRepo();
    (getDataSource as any).mockResolvedValue({ getRepository: () => sysRepo });
    await expect(TenantSubscriptionService.removeFeature(TENANT_ID, FEATURE_ID)).resolves.toBeUndefined();
    expect(sysRepo.delete).toHaveBeenCalled();
  });
});

// ─── assignPlan ───────────────────────────────────────────────────────────────

describe('TenantSubscriptionService.assignPlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND when plan does not exist', async () => {
    mockSystemDs(null);
    mockTenantDs();
    await expect(
      TenantSubscriptionService.assignPlan(TENANT_ID, { planId: PLAN_ID, billingInterval: 'MONTHLY' })
    ).rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
  });

  it('creates subscription and returns it for a new tenant', async () => {
    mockSystemDs();
    const subRepo = makeTenantSubRepo();
    subRepo.findOne = vi.fn(async () => null); // no existing subscription
    subRepo.save = vi.fn(async (e: any) => ({ ...mockSubscription, ...e }));
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });

    const result = await TenantSubscriptionService.assignPlan(TENANT_ID, {
      planId: PLAN_ID,
      billingInterval: 'MONTHLY',
    });
    expect(result.tenantId).toBe(TENANT_ID);
    expect(result.planId).toBe(PLAN_ID);
    expect(result.billingInterval).toBe('MONTHLY');
  });

  it('sets status to TRIALING when plan has trial days', async () => {
    const planWithTrial = { ...mockPlan, trialDays: 14 };
    const sysRepo = makeSystemRepo(planWithTrial);
    (getDataSource as any).mockResolvedValue({ getRepository: () => sysRepo });

    const subRepo = makeTenantSubRepo();
    subRepo.findOne = vi.fn(async () => null);
    const trialSub = { ...mockSubscription, status: 'TRIALING', trialEndsAt: new Date() };
    subRepo.save = vi.fn(async () => trialSub);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });

    const result = await TenantSubscriptionService.assignPlan(TENANT_ID, {
      planId: PLAN_ID,
      billingInterval: 'MONTHLY',
    });
    expect(result.status).toBe('TRIALING');
  });
});

// ─── cancelSubscription ───────────────────────────────────────────────────────

describe('TenantSubscriptionService.cancelSubscription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws SUBSCRIPTION_NOT_FOUND when no subscription exists', async () => {
    mockSystemDs();
    const subRepo = makeTenantSubRepo(null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });

    await expect(TenantSubscriptionService.cancelSubscription(TENANT_ID))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND);
  });

  it('throws SUBSCRIPTION_ALREADY_CANCELLED when already cancelled', async () => {
    mockSystemDs();
    const cancelledSub = { ...mockSubscription, status: 'CANCELLED' };
    const subRepo = makeTenantSubRepo(cancelledSub);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });

    await expect(TenantSubscriptionService.cancelSubscription(TENANT_ID))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ALREADY_CANCELLED);
  });

  it('cancels subscription and returns it', async () => {
    mockSystemDs();
    const cancelledSub = { ...mockSubscription, status: 'CANCELLED', cancelledAt: new Date() };
    const subRepo = makeTenantSubRepo();
    subRepo.findOne = vi.fn()
      .mockResolvedValueOnce(mockSubscription) // existence check
      .mockResolvedValueOnce(cancelledSub);    // after update
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });

    const result = await TenantSubscriptionService.cancelSubscription(TENANT_ID);
    expect(result.status).toBe('CANCELLED');
  });
});

// ─── checkFeatureAccess ───────────────────────────────────────────────────────

describe('TenantSubscriptionService.checkFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns denied when no subscription exists', async () => {
    mockSystemDs();
    const subRepo = makeTenantSubRepo(null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => subRepo });

    const result = await TenantSubscriptionService.checkFeatureAccess(TENANT_ID, 'feature_chat');
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

    const result = await TenantSubscriptionService.checkFeatureAccess(TENANT_ID, 'feature_chat');
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

    const result = await TenantSubscriptionService.checkFeatureAccess(TENANT_ID, 'feature_export');
    expect(result.allowed).toBe(false);
  });

  it('returns allowed for LIMIT feature when under limit', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'max_users', type: 'LIMIT', value: '10' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantSubscriptionService.checkFeatureAccess(TENANT_ID, 'max_users', 5);
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

    const result = await TenantSubscriptionService.checkFeatureAccess(TENANT_ID, 'max_users', 10);
    expect(result.allowed).toBe(false);
  });

  it('returns denied when subscription is CANCELLED', async () => {
    const cacheData = {
      status: 'CANCELLED',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantSubscriptionService.checkFeatureAccess(TENANT_ID, 'feature_chat');
    expect(result.allowed).toBe(false);
  });

  it('returns denied for unknown feature key', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    const result = await TenantSubscriptionService.checkFeatureAccess(TENANT_ID, 'nonexistent_feature');
    expect(result.allowed).toBe(false);
  });
});

// ─── assertFeatureAccess ──────────────────────────────────────────────────────

describe('TenantSubscriptionService.assertFeatureAccess', () => {
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

    await expect(TenantSubscriptionService.assertFeatureAccess(TENANT_ID, 'feature_export'))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_ACCESS_DENIED);
  });

  it('throws FEATURE_LIMIT_REACHED when limit feature is exceeded', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'max_users', type: 'LIMIT', value: '5' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    await expect(TenantSubscriptionService.assertFeatureAccess(TENANT_ID, 'max_users', 5))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_LIMIT_REACHED);
  });

  it('resolves when feature is allowed', async () => {
    const cacheData = {
      status: 'ACTIVE',
      gracePeriodEndsAt: null,
      features: [{ key: 'feature_chat', type: 'BOOLEAN', value: 'true' }],
    };
    (redis.get as any).mockResolvedValue(JSON.stringify(cacheData));

    await expect(TenantSubscriptionService.assertFeatureAccess(TENANT_ID, 'feature_chat'))
      .resolves.not.toThrow();
  });
});

// ─── invalidateFeatureCache ───────────────────────────────────────────────────

describe('TenantSubscriptionService.invalidateFeatureCache', () => {
  it('calls redis.del with the correct feature cache key', async () => {
    (redis.del as any).mockResolvedValue(1);
    await TenantSubscriptionService.invalidateFeatureCache(TENANT_ID);
    expect(redis.del).toHaveBeenCalledWith(`feature:sub:${TENANT_ID}`);
  });
});
