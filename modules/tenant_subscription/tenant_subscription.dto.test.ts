import { describe, it, expect } from 'vitest';
import {
  CreatePlanRequestSchema,
  UpdatePlanRequestSchema,
  GetPlansQuerySchema,
  CreateFeatureRequestSchema,
  UpdateFeatureRequestSchema,
  AssignSubscriptionRequestSchema,
} from './tenant_subscription.dto';

// ─── CreatePlanRequestSchema ──────────────────────────────────────────────────

const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreatePlanRequestSchema', () => {
  const valid = {
    productId: PRODUCT_ID,
  };

  it('accepts a valid plan with just productId', () => {
    const result = CreatePlanRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('applies default values for interval, trialDays, status', () => {
    const result = CreatePlanRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interval).toBe('MONTHLY');
      expect(result.data.trialDays).toBe(0);
      expect(result.data.status).toBe('ACTIVE');
    }
  });

  it('accepts interval=DAILY/WEEKLY/QUARTERLY/YEARLY', () => {
    for (const interval of ['DAILY', 'WEEKLY', 'QUARTERLY', 'YEARLY'] as const) {
      const result = CreatePlanRequestSchema.safeParse({ ...valid, interval });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.interval).toBe(interval);
    }
  });

  it('rejects unknown interval', () => {
    const result = CreatePlanRequestSchema.safeParse({ ...valid, interval: 'BIWEEKLY' });
    expect(result.success).toBe(false);
  });

  it('rejects missing productId', () => {
    const result = CreatePlanRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID productId', () => {
    const result = CreatePlanRequestSchema.safeParse({ productId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects negative trialDays', () => {
    const result = CreatePlanRequestSchema.safeParse({ ...valid, trialDays: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status value', () => {
    const result = CreatePlanRequestSchema.safeParse({ ...valid, status: 'DELETED' });
    expect(result.success).toBe(false);
  });
});

// ─── UpdatePlanRequestSchema ──────────────────────────────────────────────────

describe('UpdatePlanRequestSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(UpdatePlanRequestSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update with productId only', () => {
    const result = UpdatePlanRequestSchema.safeParse({ productId: PRODUCT_ID });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with interval only', () => {
    const result = UpdatePlanRequestSchema.safeParse({ interval: 'YEARLY' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid productId UUID', () => {
    const result = UpdatePlanRequestSchema.safeParse({ productId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects negative trialDays', () => {
    const result = UpdatePlanRequestSchema.safeParse({ trialDays: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = UpdatePlanRequestSchema.safeParse({ status: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });
});

// ─── GetPlansQuerySchema ──────────────────────────────────────────────────────

describe('GetPlansQuerySchema', () => {
  it('accepts empty query and defaults includeFeatures to false', () => {
    const result = GetPlansQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeFeatures).toBe(false);
    }
  });

  it('accepts valid status filter', () => {
    const result = GetPlansQuerySchema.safeParse({ status: 'INACTIVE' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown status', () => {
    const result = GetPlansQuerySchema.safeParse({ status: 'REMOVED' });
    expect(result.success).toBe(false);
  });
});

// ─── CreateFeatureRequestSchema ───────────────────────────────────────────────

describe('CreateFeatureRequestSchema', () => {
  const valid = {
    key: 'feature_chat',
    label: 'Chat',
    value: 'true',
  };

  it('accepts a valid feature', () => {
    const result = CreateFeatureRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('defaults type to BOOLEAN and sortOrder to 0', () => {
    const result = CreateFeatureRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('BOOLEAN');
      expect(result.data.sortOrder).toBe(0);
    }
  });

  it('rejects empty feature key', () => {
    const result = CreateFeatureRequestSchema.safeParse({ ...valid, key: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty label', () => {
    const result = CreateFeatureRequestSchema.safeParse({ ...valid, label: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty value', () => {
    const result = CreateFeatureRequestSchema.safeParse({ ...valid, value: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = CreateFeatureRequestSchema.safeParse({ ...valid, type: 'TEXT' });
    expect(result.success).toBe(false);
  });

  it('accepts LIMIT type', () => {
    const result = CreateFeatureRequestSchema.safeParse({ ...valid, type: 'LIMIT', value: '100' });
    expect(result.success).toBe(true);
  });
});

// ─── UpdateFeatureRequestSchema ───────────────────────────────────────────────

describe('UpdateFeatureRequestSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(UpdateFeatureRequestSchema.safeParse({}).success).toBe(true);
  });

  it('rejects empty key string', () => {
    const result = UpdateFeatureRequestSchema.safeParse({ key: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty value string', () => {
    const result = UpdateFeatureRequestSchema.safeParse({ value: '' });
    expect(result.success).toBe(false);
  });
});

// ─── AssignSubscriptionRequestSchema ─────────────────────────────────────────

describe('AssignSubscriptionRequestSchema', () => {
  const validPlanId = '00000000-0000-1000-8001-000000000005';

  it('accepts valid planId without billingInterval (derived from plan)', () => {
    const result = AssignSubscriptionRequestSchema.safeParse({ planId: validPlanId });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billingInterval).toBeUndefined();
    }
  });

  it('accepts YEARLY billing interval', () => {
    const result = AssignSubscriptionRequestSchema.safeParse({ planId: validPlanId, billingInterval: 'YEARLY' });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid planId', () => {
    const result = AssignSubscriptionRequestSchema.safeParse({ planId: 'not-a-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/invalid plan id/i);
    }
  });

  it('rejects missing planId', () => {
    const result = AssignSubscriptionRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid billingInterval', () => {
    const result = AssignSubscriptionRequestSchema.safeParse({ planId: validPlanId, billingInterval: 'BIWEEKLY' });
    expect(result.success).toBe(false);
  });

  it('accepts billingInterval=WEEKLY/DAILY/QUARTERLY', () => {
    for (const billingInterval of ['WEEKLY', 'DAILY', 'QUARTERLY'] as const) {
      const result = AssignSubscriptionRequestSchema.safeParse({ planId: validPlanId, billingInterval });
      expect(result.success).toBe(true);
    }
  });
});
