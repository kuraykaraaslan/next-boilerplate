import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/modules/db', () => ({
  getSystemDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@/modules/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import CouponService from './coupon.service';
import { getSystemDataSource, tenantDataSourceFor } from '@/modules/db';
import { COUPON_MESSAGES } from './coupon.messages';

const COUPON_ID = '550e8400-e29b-41d4-a716-446655440000';
const TENANT_ID = '660e8400-e29b-41d4-a716-446655440001';
const PLAN_ID = '770e8400-e29b-41d4-a716-446655440002';

const mockCoupon = {
  couponId: COUPON_ID,
  code: 'SAVE20',
  name: '20% Off',
  description: null,
  discountType: 'PERCENTAGE' as const,
  discountValue: 20,
  currency: null,
  applicablePlanIds: null as string[] | null,
  applicableProviders: null,
  maxUses: null as number | null,
  maxUsesPerTenant: null as number | null,
  usedCount: 0,
  minimumAmount: null as number | null,
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

function setupSystemDs(coupon: typeof mockCoupon | null = mockCoupon) {
  const repo = makeCouponRepo(coupon);
  (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

describe('CouponService.calculateDiscount', () => {
  it('calculates percentage discount correctly', () => {
    const result = CouponService.calculateDiscount({ ...mockCoupon, discountType: 'PERCENTAGE', discountValue: 20 }, 100);
    expect(result).toBe(20);
  });

  it('percentage discount rounds to 2 decimal places', () => {
    const result = CouponService.calculateDiscount({ ...mockCoupon, discountType: 'PERCENTAGE', discountValue: 10 }, 33.33);
    expect(result).toBe(3.33);
  });

  it('calculates fixed amount discount', () => {
    const result = CouponService.calculateDiscount(
      { ...mockCoupon, discountType: 'FIXED_AMOUNT', discountValue: 15, currency: 'USD' },
      100,
      'USD',
    );
    expect(result).toBe(15);
  });

  it('caps fixed discount at the order amount', () => {
    const result = CouponService.calculateDiscount(
      { ...mockCoupon, discountType: 'FIXED_AMOUNT', discountValue: 200, currency: 'USD' },
      50,
      'USD',
    );
    expect(result).toBe(50);
  });

  it('returns 0 for fixed amount when currencies do not match', () => {
    const result = CouponService.calculateDiscount(
      { ...mockCoupon, discountType: 'FIXED_AMOUNT', discountValue: 10, currency: 'EUR' },
      100,
      'USD',
    );
    expect(result).toBe(0);
  });

  it('applies fixed discount regardless of currency when coupon has no currency', () => {
    const result = CouponService.calculateDiscount(
      { ...mockCoupon, discountType: 'FIXED_AMOUNT', discountValue: 10, currency: null },
      100,
      'USD',
    );
    expect(result).toBe(10);
  });
});

describe('CouponService.getById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when coupon does not exist', async () => {
    setupSystemDs(null);
    await expect(CouponService.getById(COUPON_ID)).rejects.toThrow(COUPON_MESSAGES.NOT_FOUND);
  });

  it('returns parsed coupon on success', async () => {
    setupSystemDs(mockCoupon);
    const result = await CouponService.getById(COUPON_ID);
    expect(result.couponId).toBe(COUPON_ID);
    expect(result.code).toBe('SAVE20');
  });
});

describe('CouponService.getByCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when coupon code not found', async () => {
    setupSystemDs(null);
    const result = await CouponService.getByCode('UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns coupon when found', async () => {
    setupSystemDs(mockCoupon);
    const result = await CouponService.getByCode('SAVE20');
    expect(result?.code).toBe('SAVE20');
  });
});

describe('CouponService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws CODE_EXISTS when a coupon with that code already exists', async () => {
    setupSystemDs(mockCoupon);
    await expect(CouponService.create({
      code: 'SAVE20',
      name: 'Duplicate',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      status: 'ACTIVE',
    })).rejects.toThrow(COUPON_MESSAGES.CODE_EXISTS);
  });

  it('creates and returns coupon when code is unique', async () => {
    const repo = makeCouponRepo(null);
    // First findOne (exists check) returns null; save returns mockCoupon
    repo.save.mockResolvedValueOnce(mockCoupon);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await CouponService.create({
      code: 'NEW10',
      name: '10% Off',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      status: 'ACTIVE',
    });
    expect(result.code).toBe('SAVE20'); // from mockCoupon
    expect(repo.save).toHaveBeenCalled();
  });
});

describe('CouponService.getAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns coupons list and total', async () => {
    setupSystemDs(mockCoupon);
    const result = await CouponService.getAll({ page: 0, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.coupons).toHaveLength(1);
  });

  it('returns empty list when no coupons', async () => {
    setupSystemDs(null);
    const result = await CouponService.getAll({ page: 0, pageSize: 20 });
    expect(result.coupons).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe('CouponService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when coupon does not exist', async () => {
    setupSystemDs(null);
    await expect(CouponService.update(COUPON_ID, { name: 'New Name' })).rejects.toThrow(COUPON_MESSAGES.NOT_FOUND);
  });

  it('updates and returns coupon on success', async () => {
    const repo = makeCouponRepo(mockCoupon);
    repo.findOne
      .mockResolvedValueOnce(mockCoupon)   // exists check
      .mockResolvedValueOnce({ ...mockCoupon, name: 'Updated Name' }); // after update
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await CouponService.update(COUPON_ID, { name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });
});

describe('CouponService.archive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when coupon does not exist', async () => {
    setupSystemDs(null);
    await expect(CouponService.archive(COUPON_ID)).rejects.toThrow(COUPON_MESSAGES.NOT_FOUND);
  });

  it('calls repo.update with ARCHIVED status', async () => {
    const repo = makeCouponRepo(mockCoupon);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });
    await CouponService.archive(COUPON_ID);
    expect(repo.update).toHaveBeenCalledWith({ couponId: COUPON_ID }, { status: 'ARCHIVED' });
  });
});

describe('CouponService.validate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns invalid result for unknown coupon code', async () => {
    setupSystemDs(null);
    const result = await CouponService.validate({ code: 'UNKNOWN', tenantId: TENANT_ID });
    expect(result.valid).toBe(false);
    expect(result.message).toBe(COUPON_MESSAGES.INVALID_CODE);
  });

  it('returns invalid result when coupon is INACTIVE', async () => {
    setupSystemDs({ ...mockCoupon, status: 'INACTIVE' });
    const result = await CouponService.validate({ code: 'SAVE20', tenantId: TENANT_ID });
    expect(result.valid).toBe(false);
    expect(result.message).toBe(COUPON_MESSAGES.COUPON_INACTIVE);
  });

  it('returns invalid result when coupon has not started', async () => {
    setupSystemDs({ ...mockCoupon, startsAt: new Date('2099-01-01') });
    const result = await CouponService.validate({ code: 'SAVE20', tenantId: TENANT_ID });
    expect(result.valid).toBe(false);
    expect(result.message).toBe(COUPON_MESSAGES.COUPON_NOT_STARTED);
  });

  it('returns invalid result when coupon has expired', async () => {
    setupSystemDs({ ...mockCoupon, expiresAt: new Date('2000-01-01') });
    const result = await CouponService.validate({ code: 'SAVE20', tenantId: TENANT_ID });
    expect(result.valid).toBe(false);
    expect(result.message).toBe(COUPON_MESSAGES.COUPON_EXPIRED);
  });

  it('returns invalid result when max uses reached', async () => {
    setupSystemDs({ ...mockCoupon, maxUses: 10, usedCount: 10 });
    const result = await CouponService.validate({ code: 'SAVE20', tenantId: TENANT_ID });
    expect(result.valid).toBe(false);
    expect(result.message).toBe(COUPON_MESSAGES.MAX_USES_REACHED);
  });

  it('returns invalid when plan is not eligible', async () => {
    const otherPlan = '999e8400-e29b-41d4-a716-446655440099';
    setupSystemDs({ ...mockCoupon, applicablePlanIds: [PLAN_ID] });
    const result = await CouponService.validate({ code: 'SAVE20', tenantId: TENANT_ID, planId: otherPlan });
    expect(result.valid).toBe(false);
    expect(result.message).toBe(COUPON_MESSAGES.PLAN_NOT_ELIGIBLE);
  });

  it('returns invalid when amount below minimum', async () => {
    setupSystemDs({ ...mockCoupon, minimumAmount: 100 });
    const result = await CouponService.validate({ code: 'SAVE20', tenantId: TENANT_ID, amount: 50 });
    expect(result.valid).toBe(false);
    expect(result.message).toBe(COUPON_MESSAGES.MINIMUM_AMOUNT_NOT_MET);
  });

  it('returns valid result with computed discount for happy path', async () => {
    const repo = makeCouponRepo(mockCoupon);
    // Also need tenant DS for per-tenant check (maxUsesPerTenant is null so not called)
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await CouponService.validate({ code: 'SAVE20', tenantId: TENANT_ID, amount: 100 });
    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(20);
    expect(result.finalAmount).toBe(80);
  });
});
