import { describe, it, expect } from 'vitest';
import { DEFAULT_TIMEZONE, TIMEZONES, TimezoneSchema, isTimezone } from '../common.timezone';

describe('isTimezone', () => {
  it('accepts valid IANA zones', () => {
    expect(isTimezone('Europe/Istanbul')).toBe(true);
    expect(isTimezone('America/New_York')).toBe(true);
  });

  it('accepts the default UTC zone', () => {
    expect(isTimezone(DEFAULT_TIMEZONE)).toBe(true);
  });

  it('rejects junk and wrong casing', () => {
    expect(isTimezone('Not/AZone')).toBe(false);
    expect(isTimezone('europe/istanbul')).toBe(false);
    expect(isTimezone('')).toBe(false);
  });
});

describe('TimezoneSchema', () => {
  it('parses a valid zone', () => {
    expect(TimezoneSchema.safeParse('Europe/Istanbul').success).toBe(true);
  });

  it('rejects an invalid zone', () => {
    const result = TimezoneSchema.safeParse('Mars/Phobos');
    expect(result.success).toBe(false);
  });
});

describe('TIMEZONES', () => {
  it('is populated from the Intl database', () => {
    expect(TIMEZONES.length).toBeGreaterThan(100);
  });
});
