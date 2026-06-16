import crypto from 'crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const redisSet = vi.fn();
vi.mock('@nb/redis', () => ({ default: { set: (...a: unknown[]) => redisSet(...a) } }));
vi.mock('@nb/observability', () => ({ default: { recordTenantUsage: vi.fn() } }));

import { BaseSamlProvider, assertSamlNotReplayed } from '../saml.engine';

beforeEach(() => redisSet.mockReset());

describe('SAML engine — shared extract helpers', () => {
  it('extractSessionNotOnOrAfter parses AuthnStatement timestamp', () => {
    const xml = '<saml:Assertion ID="_abc"><saml:AuthnStatement SessionNotOnOrAfter="2999-01-01T00:00:00Z"/></saml:Assertion>';
    expect(BaseSamlProvider.extractSessionNotOnOrAfter(xml)).toBe(Date.parse('2999-01-01T00:00:00Z'));
    expect(BaseSamlProvider.extractSessionNotOnOrAfter(null)).toBeNull();
  });

  it('extractAssertionId reads the (namespaced) Assertion ID', () => {
    expect(BaseSamlProvider.extractAssertionId('<saml2:Assertion ID="_id-123" Version="2.0">')).toBe('_id-123');
    expect(BaseSamlProvider.extractAssertionId('<Assertion ID="plain">')).toBe('plain');
    expect(BaseSamlProvider.extractAssertionId(null)).toBeNull();
  });
});

describe('SAML engine — shared replay guard', () => {
  const opts = { assertionId: 'A1', sessionNotOnOrAfter: null, keyPrefix: 'auth_saml:replay:t1', scope: 't1' };

  it('no-ops without an assertion id', async () => {
    await assertSamlNotReplayed({ ...opts, assertionId: null });
    expect(redisSet).not.toHaveBeenCalled();
  });

  it('allows the first sighting (SET NX returns OK)', async () => {
    redisSet.mockResolvedValueOnce('OK');
    await expect(assertSamlNotReplayed(opts)).resolves.toBeUndefined();
    const [key, , , , mode] = redisSet.mock.calls[0];
    expect(key).toBe('auth_saml:replay:t1:' + crypto.createHash('sha256').update('A1').digest('hex'));
    expect(mode).toBe('NX');
  });

  it('rejects a replay (SET NX returns null)', async () => {
    redisSet.mockResolvedValueOnce(null);
    await expect(assertSamlNotReplayed(opts)).rejects.toThrow();
  });

  it('fails open when redis throws', async () => {
    redisSet.mockRejectedValueOnce(new Error('redis down'));
    await expect(assertSamlNotReplayed(opts)).resolves.toBeUndefined();
  });
});
