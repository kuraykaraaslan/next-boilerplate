import { describe, it, expect } from 'vitest';
import { DEFAULT_CURRENCY, isCurrencyCode } from '../common.currency';

describe('isCurrencyCode', () => {
  it('accepts valid ISO 4217 codes', () => {
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('EUR')).toBe(true);
    expect(isCurrencyCode('TRY')).toBe(true);
    expect(isCurrencyCode('JPY')).toBe(true);
  });

  it('rejects invalid or malformed codes', () => {
    expect(isCurrencyCode('usd')).toBe(false);
    expect(isCurrencyCode('XYZ')).toBe(false);
    expect(isCurrencyCode('')).toBe(false);
  });

  it('DEFAULT_CURRENCY is USD and valid', () => {
    expect(DEFAULT_CURRENCY).toBe('USD');
    expect(isCurrencyCode(DEFAULT_CURRENCY)).toBe(true);
  });
});
