import { describe, it, expect } from 'vitest';
import { COUNTRIES, CountryCodeEnum, isCountryCode } from '../common.country';

describe('isCountryCode', () => {
  it('accepts valid ISO 3166-1 alpha-2 codes', () => {
    expect(isCountryCode('US')).toBe(true);
    expect(isCountryCode('TR')).toBe(true);
    expect(isCountryCode('DE')).toBe(true);
  });

  it('rejects invalid or malformed codes', () => {
    expect(isCountryCode('XX')).toBe(false);
    expect(isCountryCode('us')).toBe(false);
    expect(isCountryCode('USA')).toBe(false);
    expect(isCountryCode('')).toBe(false);
  });
});

describe('country data', () => {
  it('covers the full ISO set (~249 codes)', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(249);
  });

  it('enum options match the COUNTRIES list', () => {
    expect([...CountryCodeEnum.options].sort()).toEqual(COUNTRIES.map((c) => c.code).sort());
  });

  it('has no duplicate codes', () => {
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
  });
});
