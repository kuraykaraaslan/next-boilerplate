import { describe, it, expect } from 'vitest';
import { UpdatePreferencesRequestSchema } from './user_preferences.dto';

describe('UpdatePreferencesRequestSchema', () => {
  const validInput = {
    theme: 'DARK',
    language: 'EN',
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    newsletter: false,
    timezone: 'Europe/Istanbul',
    dateFormat: 'MM_DD_YYYY',
    timeFormat: 'H12',
    firstDayOfWeek: 'SUN',
  };

  it('accepts a fully valid preferences object', () => {
    const result = UpdatePreferencesRequestSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('defaults theme to LIGHT when null', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, theme: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.theme).toBe('LIGHT');
  });

  it('defaults language to EN when null', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, language: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.language).toBe('EN');
  });

  it('defaults emailNotifications to true when null', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, emailNotifications: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.emailNotifications).toBe(true);
  });

  it('defaults smsNotifications to false when null', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, smsNotifications: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.smsNotifications).toBe(false);
  });

  it('defaults pushNotifications to false when null', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, pushNotifications: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pushNotifications).toBe(false);
  });

  it('defaults timezone to UTC when null', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, timezone: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.timezone).toBe('UTC');
  });

  it('defaults firstDayOfWeek to MON when null', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, firstDayOfWeek: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.firstDayOfWeek).toBe('MON');
  });

  it('rejects invalid theme value', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, theme: 'BLUE' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid language value', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, language: 'TR' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid dateFormat value', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, dateFormat: 'YYYY/MM/DD' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timeFormat value', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, timeFormat: '12H' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid firstDayOfWeek value', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, firstDayOfWeek: 'FRI' });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean emailNotifications', () => {
    const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, emailNotifications: 'yes' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid language options', () => {
    const languages = ['EN', 'ES', 'FR', 'DE', 'CN', 'JP'] as const;
    for (const language of languages) {
      const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, language });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid theme options', () => {
    const themes = ['LIGHT', 'DARK', 'SYSTEM'] as const;
    for (const theme of themes) {
      const result = UpdatePreferencesRequestSchema.safeParse({ ...validInput, theme });
      expect(result.success).toBe(true);
    }
  });
});
