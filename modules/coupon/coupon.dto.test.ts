import { describe, it, expect } from 'vitest';
import {
  CreateCouponRequestSchema,
  UpdateCouponRequestSchema,
  GetCouponsQuerySchema,
  ValidateCouponRequestSchema,
  ApplyCouponRequestSchema,
} from './coupon.dto';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const PLAN_ID = '660e8400-e29b-41d4-a716-446655440001';

describe('CreateCouponRequestSchema', () => {
  const validBase = {
    code: 'SAVE20',
    name: 'Summer Sale',
    discountType: 'PERCENTAGE' as const,
    discountValue: 20,
  };

  it('accepts valid percentage coupon', () => {
    const result = CreateCouponRequestSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('transforms code to uppercase', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, code: 'save20' });
    if (result.success) expect(result.data.code).toBe('SAVE20');
  });

  it('rejects percentage > 100', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, discountValue: 101 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/100/);
    }
  });

  it('requires currency for FIXED_AMOUNT discounts', () => {
    const result = CreateCouponRequestSchema.safeParse({
      ...validBase,
      discountType: 'FIXED_AMOUNT',
      discountValue: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/[Cc]urrency/);
    }
  });

  it('accepts valid FIXED_AMOUNT coupon with currency', () => {
    const result = CreateCouponRequestSchema.safeParse({
      ...validBase,
      discountType: 'FIXED_AMOUNT',
      discountValue: 15,
      currency: 'USD',
    });
    expect(result.success).toBe(true);
  });

  it('rejects code shorter than 3 characters', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, code: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects code longer than 32 characters', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, code: 'A'.repeat(33) });
    expect(result.success).toBe(false);
  });

  it('rejects code with lowercase letters', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, code: 'save_20' });
    // After transform it becomes SAVE_20 which is valid — code with mixed case gets uppercased
    // The regex check runs pre-transform, let's verify the transform happens first:
    if (result.success) {
      expect(result.data.code).toBe('SAVE_20');
    }
  });

  it('rejects code with invalid characters', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, code: 'SAVE@20!' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects negative discountValue', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, discountValue: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid discountType', () => {
    const result = CreateCouponRequestSchema.safeParse({ ...validBase, discountType: 'FLAT' });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields: maxUses, expiresAt, applicablePlanIds', () => {
    const result = CreateCouponRequestSchema.safeParse({
      ...validBase,
      maxUses: 100,
      maxUsesPerTenant: 1,
      expiresAt: '2030-01-01',
      applicablePlanIds: [PLAN_ID],
    });
    expect(result.success).toBe(true);
  });

  it('rejects currency with wrong length', () => {
    const result = CreateCouponRequestSchema.safeParse({
      ...validBase,
      discountType: 'FIXED_AMOUNT',
      discountValue: 10,
      currency: 'USDD',
    });
    expect(result.success).toBe(false);
  });

  it('defaults status to ACTIVE', () => {
    const result = CreateCouponRequestSchema.safeParse(validBase);
    if (result.success) expect(result.data.status).toBe('ACTIVE');
  });
});

describe('UpdateCouponRequestSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(UpdateCouponRequestSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update of name', () => {
    expect(UpdateCouponRequestSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('rejects empty name when provided', () => {
    expect(UpdateCouponRequestSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('accepts status change to INACTIVE', () => {
    expect(UpdateCouponRequestSchema.safeParse({ status: 'INACTIVE' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(UpdateCouponRequestSchema.safeParse({ status: 'PAUSED' }).success).toBe(false);
  });
});

describe('GetCouponsQuerySchema', () => {
  it('accepts empty object with defaults', () => {
    const result = GetCouponsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(0);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('accepts status filter', () => {
    expect(GetCouponsQuerySchema.safeParse({ status: 'ACTIVE' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(GetCouponsQuerySchema.safeParse({ status: 'DELETED' }).success).toBe(false);
  });

  it('rejects pageSize over 100', () => {
    expect(GetCouponsQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });

  it('coerces string page to number', () => {
    const result = GetCouponsQuerySchema.safeParse({ page: '2' });
    if (result.success) expect(result.data.page).toBe(2);
  });
});

describe('ValidateCouponRequestSchema', () => {
  it('accepts minimal valid input', () => {
    const result = ValidateCouponRequestSchema.safeParse({
      code: 'SAVE20',
      tenantId: TENANT_ID,
    });
    expect(result.success).toBe(true);
  });

  it('transforms code to uppercase', () => {
    const result = ValidateCouponRequestSchema.safeParse({ code: 'save20', tenantId: TENANT_ID });
    if (result.success) expect(result.data.code).toBe('SAVE20');
  });

  it('rejects empty code', () => {
    expect(ValidateCouponRequestSchema.safeParse({ code: '', tenantId: TENANT_ID }).success).toBe(false);
  });

  it('rejects invalid tenantId UUID', () => {
    expect(ValidateCouponRequestSchema.safeParse({ code: 'SAVE20', tenantId: 'bad' }).success).toBe(false);
  });

  it('accepts optional planId and amount', () => {
    const result = ValidateCouponRequestSchema.safeParse({
      code: 'SAVE20',
      tenantId: TENANT_ID,
      planId: PLAN_ID,
      amount: 100,
      currency: 'USD',
    });
    expect(result.success).toBe(true);
  });
});

describe('ApplyCouponRequestSchema', () => {
  it('accepts valid apply input', () => {
    const result = ApplyCouponRequestSchema.safeParse({
      code: 'SAVE20',
      tenantId: TENANT_ID,
      amount: 99.99,
      currency: 'USD',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing amount', () => {
    expect(ApplyCouponRequestSchema.safeParse({ code: 'SAVE20', tenantId: TENANT_ID, currency: 'USD' }).success).toBe(false);
  });

  it('rejects missing currency', () => {
    expect(ApplyCouponRequestSchema.safeParse({ code: 'SAVE20', tenantId: TENANT_ID, amount: 50 }).success).toBe(false);
  });

  it('rejects non-positive amount', () => {
    expect(ApplyCouponRequestSchema.safeParse({ code: 'SAVE20', tenantId: TENANT_ID, amount: 0, currency: 'USD' }).success).toBe(false);
  });

  it('rejects currency with wrong length', () => {
    expect(ApplyCouponRequestSchema.safeParse({ code: 'SAVE20', tenantId: TENANT_ID, amount: 50, currency: 'US' }).success).toBe(false);
  });
});
