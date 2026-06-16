import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@nb/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@nb/db', () => ({
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
vi.mock('@nb/webhook/server/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => {}) },
}));

import CouponCrudService from '../coupon.crud.service';
import { tenantDataSourceFor } from '@nb/db';
import { COUPON_MESSAGES } from '../coupon.messages';

const COUPON_ID = '550e8400-e29b-41d4-a716-446655440000';
const TENANT_ID = '660e8400-e29b-41d4-a716-446655440001';

const mockCoupon = {
  tenantId: TENANT_ID,
  couponId: COUPON_ID,
  code: 'SAVE20',
  name: '20% Off',
  description: null,
  discountType: 'PERCENTAGE' as const,
  discountValue: 20,
  currency: null,
  scope: null,
  maxUses: null as number | null,
  maxUsesPerTenant: null as number | null,
  usedCount: 0,
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  startsAt: null as Date | null,
  expiresAt: null as Date | null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makeCouponRepo(coupon: typeof mockCoupon | null = mockCoupon) {
  const findOne = vi.fn(async () => coupon);
  const findAndCount = vi.fn(async () => [coupon ? [coupon] : [], coupon ? 1 : 0] as const);
  const save = vi.fn(async (entity: any) => ({ ...mockCoupon, ...entity }));
  const update = vi.fn(async () => {});
  const increment = vi.fn(async () => {});
  return { findOne, findAndCount, save, update, increment };
}

function setupDs(coupon: typeof mockCoupon | null = mockCoupon) {
  const repo = makeCouponRepo(coupon);
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

describe('CouponCrudService.getById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when coupon does not exist', async () => {
    setupDs(null);
    await expect(CouponCrudService.getById(TENANT_ID, COUPON_ID)).rejects.toThrow(COUPON_MESSAGES.NOT_FOUND);
  });

  it('returns parsed coupon on success', async () => {
    setupDs(mockCoupon);
    const result = await CouponCrudService.getById(TENANT_ID, COUPON_ID);
    expect(result.couponId).toBe(COUPON_ID);
    expect(result.code).toBe('SAVE20');
  });
});

describe('CouponCrudService.getByCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when coupon code not found', async () => {
    setupDs(null);
    const result = await CouponCrudService.getByCode(TENANT_ID, 'UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns coupon when found', async () => {
    setupDs(mockCoupon);
    const result = await CouponCrudService.getByCode(TENANT_ID, 'SAVE20');
    expect(result?.code).toBe('SAVE20');
  });
});

describe('CouponCrudService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws CODE_EXISTS when a coupon with that code already exists', async () => {
    setupDs(mockCoupon);
    await expect(CouponCrudService.create(TENANT_ID, {
      code: 'SAVE20',
      name: 'Duplicate',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      status: 'ACTIVE',
    })).rejects.toThrow(COUPON_MESSAGES.CODE_EXISTS);
  });

  it('creates and returns coupon when code is unique', async () => {
    const repo = makeCouponRepo(null);
    repo.save.mockResolvedValueOnce(mockCoupon);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await CouponCrudService.create(TENANT_ID, {
      code: 'NEW10',
      name: '10% Off',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      status: 'ACTIVE',
    });
    expect(result.code).toBe('SAVE20');
    expect(repo.save).toHaveBeenCalled();
  });
});

describe('CouponCrudService.getAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns coupons list and total', async () => {
    setupDs(mockCoupon);
    const result = await CouponCrudService.getAll(TENANT_ID, { page: 0, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.coupons).toHaveLength(1);
  });

  it('returns empty list when no coupons', async () => {
    setupDs(null);
    const result = await CouponCrudService.getAll(TENANT_ID, { page: 0, pageSize: 20 });
    expect(result.coupons).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('CouponCrudService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when coupon does not exist', async () => {
    setupDs(null);
    await expect(CouponCrudService.update(TENANT_ID, COUPON_ID, { name: 'New Name' })).rejects.toThrow(COUPON_MESSAGES.NOT_FOUND);
  });

  it('updates and returns coupon on success', async () => {
    const repo = makeCouponRepo(mockCoupon);
    repo.findOne
      .mockResolvedValueOnce(mockCoupon)
      .mockResolvedValueOnce({ ...mockCoupon, name: 'Updated Name' });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await CouponCrudService.update(TENANT_ID, COUPON_ID, { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });
});

describe('CouponCrudService.archive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when coupon does not exist', async () => {
    setupDs(null);
    await expect(CouponCrudService.archive(TENANT_ID, COUPON_ID)).rejects.toThrow(COUPON_MESSAGES.NOT_FOUND);
  });

  it('calls repo.update with ARCHIVED status', async () => {
    const repo = makeCouponRepo(mockCoupon);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    await CouponCrudService.archive(TENANT_ID, COUPON_ID);
    expect(repo.update).toHaveBeenCalledWith({ tenantId: TENANT_ID, couponId: COUPON_ID }, { status: 'ARCHIVED' });
  });
});
