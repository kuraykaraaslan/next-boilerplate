import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LANGUAGES,
  LanguageCodeEnum,
  isLanguageCode,
  isLocaleCode,
  parseLocale,
} from '../common.locale';

describe('isLocaleCode (BCP-47 via language-tags)', () => {
  it('accepts well-formed registered tags, incl. bare languages', () => {
    expect(isLocaleCode('en-US')).toBe(true);
    expect(isLocaleCode('tr-TR')).toBe(true);
    expect(isLocaleCode('pt-BR')).toBe(true);
    expect(isLocaleCode('en')).toBe(true);
  });

  it('rejects unregistered or malformed tags', () => {
    expect(isLocaleCode('xx-YY')).toBe(false);
    expect(isLocaleCode('zz')).toBe(false);
    expect(isLocaleCode('')).toBe(false);
  });
});

describe('parseLocale', () => {
  it('returns canonical region tags as-is', () => {
    expect(parseLocale('de-DE')).toBe('de-DE');
  });

  it('keeps a valid bare language', () => {
    expect(parseLocale('tr')).toBe('tr');
    expect(parseLocale('de')).toBe('de');
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

describe('languages (from countries-list)', () => {
  it('isLanguageCode accepts ISO 639-1 codes and rejects others', () => {
    expect(isLanguageCode('en')).toBe(true);
    expect(isLanguageCode('tr')).toBe(true);
    expect(isLanguageCode('zz')).toBe(false);
    expect(isLanguageCode('EN')).toBe(false);
  });

  it('exposes a sizeable language list', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(150);
  });

  it('LanguageCodeEnum options match the LANGUAGES list', () => {
    expect([...LanguageCodeEnum.options].sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });

  it('LOCALES (language dropdown) mirrors LANGUAGES codes', () => {
    expect(LOCALES.map((l) => l.code).sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });
});

describe('locale defaults', () => {
  it('DEFAULT_LOCALE is en-US and valid', () => {
    expect(DEFAULT_LOCALE).toBe('en-US');
    expect(isLocaleCode(DEFAULT_LOCALE)).toBe(true);
  });
});
