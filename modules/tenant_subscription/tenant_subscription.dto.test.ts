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

describe('CreatePlanRequestSchema', () => {
  const valid = {
    name: 'Pro Plan',
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
  };

  it('accepts a valid plan', () => {
    const result = CreatePlanRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('applies default values for currency, trialDays, sortOrder, isDefault, status', () => {
    const result = CreatePlanRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('USD');
      expect(result.data.trialDays).toBe(0);
      expect(result.data.sortOrder).toBe(0);
      expect(result.data.isDefault).toBe(false);
      expect(result.data.status).toBe('ACTIVE');
    }
  });

  it('rejects empty plan name', () => {
    const result = CreatePlanRequestSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/required/i);
    }
  });

  it('rejects negative monthlyPrice', () => {
    const result = CreatePlanRequestSchema.safeParse({ ...valid, monthlyPrice: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative yearlyPrice', () => {
    const result = CreatePlanRequestSchema.safeParse({ ...valid, yearlyPrice: -5 });
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

  it('rejects currency longer than 3 chars', () => {
    const result = CreatePlanRequestSchema.safeParse({ ...valid, currency: 'EURUSD' });
    expect(result.success).toBe(false);
  });

  it('accepts description as optional', () => {
    const result = CreatePlanRequestSchema.safeParse({ ...valid, description: 'A great plan' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('A great plan');
    }
  });
});

// ─── UpdatePlanRequestSchema ──────────────────────────────────────────────────

describe('UpdatePlanRequestSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(UpdatePlanRequestSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update with name only', () => {
    const result = UpdatePlanRequestSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name string', () => {
    const result = UpdatePlanRequestSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects negative monthlyPrice', () => {
    const result = UpdatePlanRequestSchema.safeParse({ monthlyPrice: -10 });
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

  it('accepts valid planId with default MONTHLY interval', () => {
    const result = AssignSubscriptionRequestSchema.safeParse({ planId: validPlanId });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billingInterval).toBe('MONTHLY');
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
    const result = AssignSubscriptionRequestSchema.safeParse({ planId: validPlanId, billingInterval: 'WEEKLY' });
    expect(result.success).toBe(false);
  });
});
