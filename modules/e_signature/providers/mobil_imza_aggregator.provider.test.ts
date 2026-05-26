import { describe, it, expect, vi } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    MOBIL_IMZA_AGGREGATOR_BASE_URL: 'https://aggregator.test',
    MOBIL_IMZA_AGGREGATOR_API_KEY: 'test-key',
    MOBIL_IMZA_AGGREGATOR_CUSTOMER_CODE: 'CUST',
  },
}));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('../e_signature.crypto.service', () => ({ default: { parseCertificate: vi.fn() } }));

import MobilImzaAggregatorProvider from './mobil_imza_aggregator.provider';

describe('MobilImzaAggregatorProvider.validateIdentifier', () => {
  const provider = new MobilImzaAggregatorProvider();

  it('accepts well-formed TR mobile MSISDN in E.164', () => {
    expect(provider.validateIdentifier('+905321234567')).toEqual({ ok: true, normalized: '+905321234567' });
  });

  it('strips spaces and dashes before validation', () => {
    expect(provider.validateIdentifier('+90 532 123 45 67')).toEqual({ ok: true, normalized: '+905321234567' });
    expect(provider.validateIdentifier('+90-532-123-4567')).toEqual({ ok: true, normalized: '+905321234567' });
  });

  it('rejects numbers without E.164 prefix', () => {
    expect(provider.validateIdentifier('05321234567').ok).toBe(false);
    expect(provider.validateIdentifier('5321234567').ok).toBe(false);
  });

  it('rejects non-mobile (non-5XX) ranges', () => {
    expect(provider.validateIdentifier('+902121234567').ok).toBe(false);
  });

  it('rejects foreign numbers', () => {
    expect(provider.validateIdentifier('+447911123456').ok).toBe(false);
  });
});

describe('MobilImzaAggregatorProvider metadata', () => {
  const provider = new MobilImzaAggregatorProvider();
  it('declares TR coverage and only the login capability for MVP', () => {
    expect(provider.supportedCountries).toEqual(['TR']);
    expect(provider.capabilities).toEqual(['login']);
    expect(provider.defaultLoA).toBe('high');
  });

  it('rejects document-signing methods until v2', async () => {
    await expect(
      provider.initiateDocumentSign({
        documentHash: Buffer.from('x'),
        documentHashAlgorithm: 'sha256',
        identifier: '+905321234567',
        format: 'PAdES',
      }),
    ).rejects.toThrow(/not implemented/i);
  });
});
