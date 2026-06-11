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

import TenantPlanService from '../tenant_subscription.plan.service';
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

// A single repo whose findOne routes by the `where` key it receives, so one
// repo instance can stand in for Plan / Product / Feature / Subscription lookups.
// The source resolves every entity through tenantDataSourceFor(tenantId) (there
// is no separate system datasource after the service split), so this repo is
// registered on tenantDataSourceFor below.
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

// All plan/feature/product/subscription reads in the source resolve through
// tenantDataSourceFor(tenantId), so register the system repo there.
function mockSystemDs(planOverride?: any, featureOverride?: any) {
  const sysRepo = makeSystemRepo(planOverride, featureOverride);
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => sysRepo });
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

describe('TenantPlanService.createPlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates and returns a plan with product embedded', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo() });
    const result = await TenantPlanService.createPlan(TENANT_ID, {
      productId: PRODUCT_ID,
      interval: 'MONTHLY',
      trialDays: 0,
      status: 'ACTIVE',
    });
    expect(result.productId).toBe(PRODUCT_ID);
    expect(result.interval).toBe('MONTHLY');
    expect(result.product?.name).toBe('Basic Plan');
  });
});

describe('TenantPlanService.updatePlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND when plan does not exist', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo(null) });
    await expect(TenantPlanService.updatePlan(TENANT_ID, PLAN_ID, { interval: 'YEARLY' }))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
  });

  it('returns updated plan with product', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo() });
    const result = await TenantPlanService.updatePlan(TENANT_ID, PLAN_ID, { interval: 'YEARLY' });
    expect(result.product?.name).toBe('Basic Plan');
    expect(result.productId).toBe(PRODUCT_ID);
  });
});

describe('TenantPlanService.deletePlan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND when plan does not exist', async () => {
    mockSystemDs(null);
    await expect(TenantPlanService.deletePlan(TENANT_ID, PLAN_ID))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
  });

  it('throws PLAN_HAS_SUBSCRIPTIONS when active subscriptions exist', async () => {
    // deletePlan resolves both the plan (findOne) and the active-subscription
    // count through the same tenantDataSourceFor repo, so override count on it.
    const sysRepo = mockSystemDs();
    sysRepo.count = vi.fn(async () => 1);

    await expect(TenantPlanService.deletePlan(TENANT_ID, PLAN_ID))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_HAS_SUBSCRIPTIONS);
  });

  it('deletes the plan when no active subscriptions exist', async () => {
    const sysRepo = mockSystemDs();
    sysRepo.count = vi.fn(async () => 0);

    await expect(TenantPlanService.deletePlan(TENANT_ID, PLAN_ID)).resolves.toBeUndefined();
    expect(sysRepo.delete).toHaveBeenCalled();
  });
});

describe('TenantPlanService.getPlanById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND for unknown planId', async () => {
    mockSystemDs(null);
    await expect(TenantPlanService.getPlanById(TENANT_ID, 'unknown-id'))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
  });

  it('returns the plan', async () => {
    mockSystemDs();
    const result = await TenantPlanService.getPlanById(TENANT_ID, PLAN_ID);
    expect(result.planId).toBe(PLAN_ID);
  });

  it('returns a null product instead of throwing when the product was deleted', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo(mockPlan, null) });
    const result = await TenantPlanService.getPlanById(TENANT_ID, PLAN_ID);
    expect(result.planId).toBe(PLAN_ID);
    expect(result.product).toBeNull();
  });
});

describe('TenantPlanService.getPlans', () => {
  beforeEach(() => vi.clearAllMocks());

  it('embeds a null product for plans whose product was deleted (no throw)', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo(mockPlan, null) });
    const result = await TenantPlanService.getPlans(TENANT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].product).toBeNull();
  });
});

describe('TenantPlanService.getPlansWithFeatures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('embeds a null product for plans whose product was deleted (no throw)', async () => {
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: makeMultiRepo(mockPlan, null) });
    const result = await TenantPlanService.getPlansWithFeatures(TENANT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].product).toBeNull();
  });
});

// ─── Feature CRUD ─────────────────────────────────────────────────────────────

describe('TenantPlanService.addFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws PLAN_NOT_FOUND when plan does not exist', async () => {
    mockSystemDs(null);
    await expect(
      TenantPlanService.addFeature(TENANT_ID, PLAN_ID, {
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
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => sysRepo });

    const result = await TenantPlanService.addFeature(TENANT_ID, PLAN_ID, {
      key: 'feature_chat',
      label: 'Chat',
      type: 'BOOLEAN',
      value: 'true',
      sortOrder: 0,
    });
    expect(result.key).toBe('feature_chat');
  });
});

describe('TenantPlanService.updateFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FEATURE_NOT_FOUND when feature does not exist', async () => {
    const sysRepo = makeSystemRepo(mockPlan, null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => sysRepo });
    await expect(TenantPlanService.updateFeature(TENANT_ID, FEATURE_ID, { label: 'New' }))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND);
  });
});

describe('TenantPlanService.removeFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FEATURE_NOT_FOUND when feature does not exist', async () => {
    const sysRepo = makeSystemRepo(mockPlan, null);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => sysRepo });
    await expect(TenantPlanService.removeFeature(TENANT_ID, FEATURE_ID))
      .rejects.toThrow(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND);
  });

  it('deletes the feature successfully', async () => {
    const sysRepo = makeSystemRepo();
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => sysRepo });
    await expect(TenantPlanService.removeFeature(TENANT_ID, FEATURE_ID)).resolves.toBeUndefined();
    expect(sysRepo.delete).toHaveBeenCalled();
  });
});

