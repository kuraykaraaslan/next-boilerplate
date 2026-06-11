import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LocaleCodeEnum,
  isLocaleCode,
  parseLocale,
} from '../common.locale';

describe('isLocaleCode', () => {
  it('accepts supported locale codes', () => {
    expect(isLocaleCode('en-US')).toBe(true);
    expect(isLocaleCode('tr-TR')).toBe(true);
    expect(isLocaleCode('pt-BR')).toBe(true);
  });

  it('rejects unsupported or malformed codes', () => {
    expect(isLocaleCode('xx-YY')).toBe(false);
    expect(isLocaleCode('en')).toBe(false);
    expect(isLocaleCode('')).toBe(false);
  });
});

describe('parseLocale', () => {
  it('returns exact supported codes', () => {
    expect(parseLocale('de-DE')).toBe('de-DE');
  });

  it('resolves a bare language to a best-match regional locale', () => {
    expect(parseLocale('tr')).toBe('tr-TR');
    expect(parseLocale('de')).toBe('de-DE');
  });

  it('normalises casing and underscores', () => {
    expect(parseLocale('tr_tr')).toBe('tr-TR');
    expect(parseLocale('EN-us')).toBe('en-US');
  });

  it('returns null for unknown or empty input', () => {
    expect(parseLocale('zz')).toBeNull();
    expect(parseLocale('')).toBeNull();
    expect(parseLocale(null)).toBeNull();
    expect(parseLocale(undefined)).toBeNull();
  });
});

describe('locale metadata', () => {
  it('DEFAULT_LOCALE is en-US and a valid code', () => {
    expect(DEFAULT_LOCALE).toBe('en-US');
    expect(isLocaleCode(DEFAULT_LOCALE)).toBe(true);
  });

  it('LOCALES covers every enum option exactly once', () => {
    const codes = LOCALES.map((l) => l.code).sort();
    const options = [...LocaleCodeEnum.options].sort();
    expect(codes).toEqual(options);
  });
});
