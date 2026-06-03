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

