import { describe, it, expect } from 'vitest';
import {
  CreateFlagDTO,
  UpdateFlagDTO,
  ListFlagsQuery,
  SetOverrideDTO,
  EvaluateDTO,
  FlagKeySchema,
} from '../feature_flags.dto';

describe('FlagKeySchema', () => {
  it('accepts kebab/snake lowercase keys', () => {
    expect(FlagKeySchema.safeParse('new-checkout').success).toBe(true);
    expect(FlagKeySchema.safeParse('new_checkout2').success).toBe(true);
  });
  it('rejects uppercase, spaces, leading symbols', () => {
    expect(FlagKeySchema.safeParse('NewCheckout').success).toBe(false);
    expect(FlagKeySchema.safeParse('new checkout').success).toBe(false);
    expect(FlagKeySchema.safeParse('-bad').success).toBe(false);
    expect(FlagKeySchema.safeParse('').success).toBe(false);
  });
});

describe('CreateFlagDTO', () => {
  it('defaults enabled=false, rollout=0', () => {
    const parsed = CreateFlagDTO.parse({ key: 'f', name: 'F' });
    expect(parsed.enabled).toBe(false);
    expect(parsed.rolloutPercentage).toBe(0);
  });
  it('rejects rollout outside 0..100', () => {
    expect(CreateFlagDTO.safeParse({ key: 'f', name: 'F', rolloutPercentage: 101 }).success).toBe(false);
    expect(CreateFlagDTO.safeParse({ key: 'f', name: 'F', rolloutPercentage: -1 }).success).toBe(false);
  });
  it('validates targeting rules', () => {
    const ok = CreateFlagDTO.safeParse({
      key: 'f',
      name: 'F',
      targetingRules: [{ attribute: 'plan', operator: 'in', values: ['pro'] }],
    });
    expect(ok.success).toBe(true);
    const bad = CreateFlagDTO.safeParse({
      key: 'f',
      name: 'F',
      targetingRules: [{ attribute: 'plan', operator: 'bogus', values: ['pro'] }],
    });
    expect(bad.success).toBe(false);
  });
});

describe('UpdateFlagDTO', () => {
  it('allows partial updates', () => {
    expect(UpdateFlagDTO.safeParse({ rolloutPercentage: 50 }).success).toBe(true);
    expect(UpdateFlagDTO.safeParse({}).success).toBe(true);
  });
});

describe('ListFlagsQuery', () => {
  it('coerces page/pageSize and enabled string', () => {
    const parsed = ListFlagsQuery.parse({ page: '2', pageSize: '10', enabled: 'true' });
    expect(parsed).toMatchObject({ page: 2, pageSize: 10, enabled: true });
  });
  it('enabled omitted stays undefined', () => {
    expect(ListFlagsQuery.parse({}).enabled).toBeUndefined();
  });
});

describe('SetOverrideDTO', () => {
  it('requires subjectType/subjectId/enabled', () => {
    expect(SetOverrideDTO.safeParse({ subjectType: 'user', subjectId: 'u1', enabled: true }).success).toBe(true);
    expect(SetOverrideDTO.safeParse({ subjectType: 'bogus', subjectId: 'u1', enabled: true }).success).toBe(false);
  });
});

describe('EvaluateDTO', () => {
  it('accepts a single-key evaluation', () => {
    expect(EvaluateDTO.safeParse({ key: 'f', userId: 'u1', attributes: { plan: 'pro' } }).success).toBe(true);
  });
  it('accepts an all-flags evaluation (no key)', () => {
    expect(EvaluateDTO.safeParse({ userId: 'u1' }).success).toBe(true);
  });
});
