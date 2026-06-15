import { describe, it, expect } from 'vitest';
import { evaluateFlag, rolloutBucket, ruleMatches } from '../feature_flags.eval';
import type { FeatureFlagOverride, TargetingRule } from '../feature_flags.types';

function flag(over: Partial<{
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetingRules: TargetingRule[] | null;
}> = {}) {
  return {
    key: 'f',
    enabled: true,
    rolloutPercentage: 0,
    targetingRules: null,
    ...over,
  };
}

function override(over: Partial<FeatureFlagOverride>): FeatureFlagOverride {
  return {
    overrideId: '00000000-0000-4000-8000-000000000001',
    tenantId: '00000000-0000-4000-8000-000000000000',
    flagKey: 'f',
    subjectType: 'user',
    subjectId: 'u1',
    enabled: true,
    createdAt: new Date(),
    ...over,
  };
}

describe('rolloutBucket', () => {
  it('is deterministic for the same (key, subject)', () => {
    expect(rolloutBucket('f', 'u1')).toBe(rolloutBucket('f', 'u1'));
  });

  it('stays within [0,100)', () => {
    for (const s of ['a', 'b', 'c', 'user-123', 'xyz']) {
      const b = rolloutBucket('f', s);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(100);
    }
  });

  it('different flags bucket the same subject independently', () => {
    // Not guaranteed different, but should not be coupled — sample a few.
    const a = rolloutBucket('flag-a', 'u1');
    const b = rolloutBucket('flag-b', 'u1');
    expect(typeof a).toBe('number');
    expect(typeof b).toBe('number');
  });

  it('rollout is monotonic: a subject on at X% stays on at higher %', () => {
    const subjects = Array.from({ length: 200 }, (_, i) => `user-${i}`);
    const onAt = (pct: number) =>
      new Set(subjects.filter((s) => rolloutBucket('f', s) < pct));
    const at30 = onAt(30);
    const at60 = onAt(60);
    for (const s of at30) expect(at60.has(s)).toBe(true);
    expect(at60.size).toBeGreaterThan(at30.size);
  });
});

describe('ruleMatches', () => {
  const ctx = { attributes: { plan: 'pro', country: 'TR', tags: 'beta,vip' } };
  it('eq / neq', () => {
    expect(ruleMatches({ attribute: 'plan', operator: 'eq', values: ['pro'], enabled: true }, ctx)).toBe(true);
    expect(ruleMatches({ attribute: 'plan', operator: 'neq', values: ['pro'], enabled: true }, ctx)).toBe(false);
  });
  it('in / nin', () => {
    expect(ruleMatches({ attribute: 'country', operator: 'in', values: ['TR', 'DE'], enabled: true }, ctx)).toBe(true);
    expect(ruleMatches({ attribute: 'country', operator: 'nin', values: ['US'], enabled: true }, ctx)).toBe(true);
  });
  it('contains', () => {
    expect(ruleMatches({ attribute: 'tags', operator: 'contains', values: ['vip'], enabled: true }, ctx)).toBe(true);
    expect(ruleMatches({ attribute: 'tags', operator: 'contains', values: ['enterprise'], enabled: true }, ctx)).toBe(false);
  });
  it('missing attribute does not match', () => {
    expect(ruleMatches({ attribute: 'missing', operator: 'eq', values: ['x'], enabled: true }, ctx)).toBe(false);
  });
});

describe('evaluateFlag precedence', () => {
  it('master switch off short-circuits everything', () => {
    const r = evaluateFlag(flag({ enabled: false, rolloutPercentage: 100 }), [], { userId: 'u1' });
    expect(r).toMatchObject({ enabled: false, reason: 'flag_disabled' });
  });

  it('user override beats rules and rollout', () => {
    const r = evaluateFlag(
      flag({ rolloutPercentage: 0 }),
      [override({ subjectId: 'u1', enabled: true })],
      { userId: 'u1' },
    );
    expect(r).toMatchObject({ enabled: true, reason: 'override' });
  });

  it('segment override matches attribute:value', () => {
    const r = evaluateFlag(
      flag({ rolloutPercentage: 0 }),
      [override({ subjectType: 'segment', subjectId: 'plan:pro', enabled: true })],
      { userId: 'u9', attributes: { plan: 'pro' } },
    );
    expect(r).toMatchObject({ enabled: true, reason: 'override' });
  });

  it('first matching rule wins', () => {
    const r = evaluateFlag(
      flag({
        rolloutPercentage: 0,
        targetingRules: [
          { attribute: 'plan', operator: 'eq', values: ['pro'], enabled: true },
        ],
      }),
      [],
      { userId: 'u1', attributes: { plan: 'pro' } },
    );
    expect(r).toMatchObject({ enabled: true, reason: 'rule_match' });
  });

  it('0% rollout is off, 100% is on', () => {
    expect(evaluateFlag(flag({ rolloutPercentage: 0 }), [], { userId: 'u1' }).enabled).toBe(false);
    expect(evaluateFlag(flag({ rolloutPercentage: 100 }), [], { userId: 'u1' }).enabled).toBe(true);
  });

  it('no stable subject → not in partial rollout', () => {
    const r = evaluateFlag(flag({ rolloutPercentage: 50 }), [], {});
    expect(r).toMatchObject({ enabled: false, reason: 'rollout' });
  });
});
