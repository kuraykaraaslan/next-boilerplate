import { describe, it, expect } from 'vitest';
import {
  RecordConsentDTO,
  RecordManyDTO,
  ListConsentQuery,
  UpdateBannerConfigDTO,
} from '../terms_consent.dto';

describe('RecordConsentDTO', () => {
  it('accepts a minimal single decision', () => {
    const parsed = RecordConsentDTO.safeParse({ purpose: 'analytics', granted: true, anonymousId: 'a1' });
    expect(parsed.success).toBe(true);
  });
  it('rejects an unknown purpose', () => {
    expect(RecordConsentDTO.safeParse({ purpose: 'bogus', granted: true }).success).toBe(false);
  });
  it('rejects a non-uuid userId', () => {
    expect(RecordConsentDTO.safeParse({ purpose: 'analytics', granted: true, userId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('RecordManyDTO', () => {
  it('accepts an array of decisions', () => {
    const parsed = RecordManyDTO.safeParse({
      decisions: [
        { purpose: 'analytics', granted: true },
        { purpose: 'marketing', granted: false },
      ],
      anonymousId: 'a1',
    });
    expect(parsed.success).toBe(true);
  });
  it('requires at least one decision', () => {
    expect(RecordManyDTO.safeParse({ decisions: [] }).success).toBe(false);
  });
  it('rejects an invalid purpose inside decisions', () => {
    expect(RecordManyDTO.safeParse({ decisions: [{ purpose: 'x', granted: true }] }).success).toBe(false);
  });
});

describe('ListConsentQuery', () => {
  it('coerces page/pageSize and transforms granted string', () => {
    const parsed = ListConsentQuery.parse({ page: '2', pageSize: '10', granted: 'true', purpose: 'marketing' });
    expect(parsed).toMatchObject({ page: 2, pageSize: 10, granted: true, purpose: 'marketing' });
  });
  it('defaults page=0, pageSize=50 and leaves granted undefined', () => {
    const parsed = ListConsentQuery.parse({});
    expect(parsed.page).toBe(0);
    expect(parsed.pageSize).toBe(50);
    expect(parsed.granted).toBeUndefined();
  });
  it('caps pageSize at 200', () => {
    expect(ListConsentQuery.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});

describe('UpdateBannerConfigDTO', () => {
  it('allows fully partial updates', () => {
    expect(UpdateBannerConfigDTO.safeParse({}).success).toBe(true);
    expect(UpdateBannerConfigDTO.safeParse({ enabled: true }).success).toBe(true);
  });
  it('validates the purposes array shape', () => {
    const ok = UpdateBannerConfigDTO.safeParse({
      purposes: [{ key: 'necessary', label: 'Necessary', description: 'Required', required: true }],
    });
    expect(ok.success).toBe(true);
    const bad = UpdateBannerConfigDTO.safeParse({
      purposes: [{ key: 'bogus', label: 'X', description: 'Y', required: true }],
    });
    expect(bad.success).toBe(false);
  });
});
