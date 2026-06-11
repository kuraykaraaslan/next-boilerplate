import { describe, it, expect, vi } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));
vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));
vi.mock('@/modules/redis', () => ({
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
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import ESignatureIdentityService from '../e_signature.identity.service';
import type { RawIdentityClaims } from '../e_signature.types';

const baseClaims: RawIdentityClaims = {
  commonName: 'AYŞE YILMAZ',
  givenName: 'AYŞE',
  familyName: 'YILMAZ',
  serialNumber: '12345678901',
  nationalId: '12345678901',
  birthDate: null,
  issuerDN: 'C=TR,O=Kamu SM,CN=Kamu SM SSL Sertifika Hizmet Saglayicisi - Surum 1',
  issuerCountry: 'TR',
  certSerialHex: 'ABCDEF0123456789',
  certFingerprintSha256: 'A'.repeat(64),
  notBefore: '2026-01-01T00:00:00.000Z',
  notAfter: '2027-01-01T00:00:00.000Z',
};

describe('ESignatureIdentityService.normalize', () => {
  it('produces an OIDC4IDA verified_claims envelope', () => {
    const out = ESignatureIdentityService.normalize({
      raw: baseClaims,
      providerName: 'mobil_imza_aggregator',
      country: 'TR',
      loa: 'high',
    });
    expect(out.given_name).toBe('AYŞE');
    expect(out.family_name).toBe('YILMAZ');
    expect(out.country).toBe('TR');
    expect(out.loa).toBe('high');
    expect(out.provider).toBe('mobil_imza_aggregator');
    expect(out.evidence).toEqual({
      type: 'electronic_signature',
      issuer_dn: baseClaims.issuerDN,
      serial: baseClaims.certSerialHex,
      fingerprint_sha256: baseClaims.certFingerprintSha256,
      not_before: baseClaims.notBefore,
      not_after: baseClaims.notAfter,
    });
  });

  it('hashes the national identifier and never leaks plaintext', () => {
    const out = ESignatureIdentityService.normalize({
      raw: baseClaims,
      providerName: 'mobil_imza_aggregator',
      country: 'TR',
      loa: 'high',
    });
    expect(out.national_id).not.toBeNull();
    expect(out.national_id?.country).toBe('TR');
    expect(out.national_id?.value_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(out)).not.toContain('12345678901');
  });

  it('handles missing national id', () => {
    const out = ESignatureIdentityService.normalize({
      raw: { ...baseClaims, nationalId: null, serialNumber: null },
      providerName: 'mobil_imza_aggregator',
      country: 'TR',
      loa: 'substantial',
    });
    expect(out.national_id).toBeNull();
    expect(out.loa).toBe('substantial');
  });

  it('uses the issuer country when present for the national_id salt', () => {
    const out = ESignatureIdentityService.normalize({
      raw: { ...baseClaims, issuerCountry: 'EE' },
      providerName: 'smart_id',
      country: 'EE',
      loa: 'high',
    });
    expect(out.national_id?.country).toBe('EE');
  });
});
