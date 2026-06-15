import { describe, it, expect } from 'vitest';
import { deriveConsentState } from '../terms_consent.state';
import type { ConsentRecord } from '../terms_consent.types';

function rec(over: Partial<ConsentRecord>): ConsentRecord {
  return {
    consentId: '00000000-0000-4000-8000-000000000001',
    tenantId: '00000000-0000-4000-8000-000000000000',
    subjectUserId: null,
    subjectAnonymousId: 'anon-1',
    purpose: 'analytics',
    granted: true,
    policyVersion: '1',
    source: 'banner',
    ipAddress: null,
    userAgent: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...over,
  };
}

describe('deriveConsentState', () => {
  it('returns necessary=true even for empty input', () => {
    expect(deriveConsentState([])).toEqual({ necessary: true });
  });

  it('necessary is always true regardless of ledger', () => {
    const state = deriveConsentState([rec({ purpose: 'necessary', granted: false })]);
    expect(state.necessary).toBe(true);
  });

  it('latest decision per purpose wins (later createdAt)', () => {
    const state = deriveConsentState([
      rec({ purpose: 'marketing', granted: true, createdAt: new Date('2024-01-01T00:00:00Z') }),
      rec({ purpose: 'marketing', granted: false, createdAt: new Date('2024-02-01T00:00:00Z') }),
    ]);
    expect(state.marketing).toBe(false);
  });

  it('is order-independent in the input array (sorts by createdAt)', () => {
    const state = deriveConsentState([
      rec({ purpose: 'analytics', granted: false, createdAt: new Date('2024-03-01T00:00:00Z') }),
      rec({ purpose: 'analytics', granted: true, createdAt: new Date('2024-01-01T00:00:00Z') }),
    ]);
    // Later row (March, granted:false) wins even though it came first in the array.
    expect(state.analytics).toBe(false);
  });

  it('tracks multiple purposes independently', () => {
    const state = deriveConsentState([
      rec({ purpose: 'functional', granted: true }),
      rec({ purpose: 'analytics', granted: false }),
      rec({ purpose: 'marketing', granted: true }),
    ]);
    expect(state).toMatchObject({
      necessary: true,
      functional: true,
      analytics: false,
      marketing: true,
    });
  });

  it('does not mutate the input array', () => {
    const input = [
      rec({ purpose: 'analytics', createdAt: new Date('2024-02-01T00:00:00Z') }),
      rec({ purpose: 'analytics', createdAt: new Date('2024-01-01T00:00:00Z') }),
    ];
    const snapshot = input.map((r) => r.createdAt.getTime());
    deriveConsentState(input);
    expect(input.map((r) => r.createdAt.getTime())).toEqual(snapshot);
  });
});
