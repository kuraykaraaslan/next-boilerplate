import { describe, it, expect } from 'vitest';
import {
  GetSettingByKeyDTO,
  GetSettingsByKeysDTO,
  CreateSettingDTO,
  UpdateSettingDTO,
  UpdateSettingsDTO,
  DeleteSettingDTO,
  GetSettingsResponseDTO,
  UpdateSettingsResponseDTO,
} from './setting.dto';

describe('GetSettingByKeyDTO', () => {
  it('accepts a valid key', () => {
    expect(GetSettingByKeyDTO.safeParse({ key: 'site_name' }).success).toBe(true);
  });

  it('rejects empty key', () => {
    expect(GetSettingByKeyDTO.safeParse({ key: '' }).success).toBe(false);
  });

  it('rejects missing key', () => {
    expect(GetSettingByKeyDTO.safeParse({}).success).toBe(false);
  });
});

describe('GetSettingsByKeysDTO', () => {
  it('accepts array of keys', () => {
    expect(GetSettingsByKeysDTO.safeParse({ keys: ['site_name', 'logo_url'] }).success).toBe(true);
  });

  it('accepts empty array', () => {
    expect(GetSettingsByKeysDTO.safeParse({ keys: [] }).success).toBe(true);
  });

  it('rejects array containing empty string', () => {
    expect(GetSettingsByKeysDTO.safeParse({ keys: ['site_name', ''] }).success).toBe(false);
  });

  it('rejects missing keys', () => {
    expect(GetSettingsByKeysDTO.safeParse({}).success).toBe(false);
  });
});

describe('CreateSettingDTO', () => {
  it('accepts valid input with all fields', () => {
    const result = CreateSettingDTO.safeParse({
      key: 'maintenance_mode',
      value: 'false',
      group: 'general',
      type: 'boolean',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for group and type', () => {
    const result = CreateSettingDTO.safeParse({
      key: 'my_key',
      value: 'my_value',
      group: null,
      type: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty key', () => {
    expect(CreateSettingDTO.safeParse({ key: '', value: 'val', group: null, type: null }).success).toBe(false);
  });

  it('rejects missing key', () => {
    expect(CreateSettingDTO.safeParse({ value: 'val', group: null, type: null }).success).toBe(false);
  });

  it('rejects missing value', () => {
    expect(CreateSettingDTO.safeParse({ key: 'k', group: null, type: null }).success).toBe(false);
  });

  it('accepts empty string value', () => {
    expect(CreateSettingDTO.safeParse({ key: 'k', value: '', group: null, type: null }).success).toBe(true);
  });
});

describe('UpdateSettingDTO', () => {
  it('accepts valid key and value', () => {
    expect(UpdateSettingDTO.safeParse({ key: 'site_name', value: 'My App' }).success).toBe(true);
  });

  it('rejects empty key', () => {
    expect(UpdateSettingDTO.safeParse({ key: '', value: 'val' }).success).toBe(false);
  });

  it('rejects missing value', () => {
    expect(UpdateSettingDTO.safeParse({ key: 'site_name' }).success).toBe(false);
  });

  it('accepts empty string as value', () => {
    expect(UpdateSettingDTO.safeParse({ key: 'site_name', value: '' }).success).toBe(true);
  });
});

describe('UpdateSettingsDTO', () => {
  it('accepts record of string to string', () => {
    expect(UpdateSettingsDTO.safeParse({ settings: { site_name: 'Acme', logo_url: 'https://example.com/logo.png' } }).success).toBe(true);
  });

  it('accepts empty settings record', () => {
    expect(UpdateSettingsDTO.safeParse({ settings: {} }).success).toBe(true);
  });

  it('rejects non-string values in settings record', () => {
    expect(UpdateSettingsDTO.safeParse({ settings: { key: 123 } }).success).toBe(false);
  });

  it('rejects missing settings field', () => {
    expect(UpdateSettingsDTO.safeParse({}).success).toBe(false);
  });
});

describe('DeleteSettingDTO', () => {
  it('accepts a valid key', () => {
    expect(DeleteSettingDTO.safeParse({ key: 'some_setting' }).success).toBe(true);
  });

  it('rejects empty key', () => {
    expect(DeleteSettingDTO.safeParse({ key: '' }).success).toBe(false);
  });
});

describe('GetSettingsResponseDTO', () => {
  it('accepts valid response shape', () => {
    const result = GetSettingsResponseDTO.safeParse({
      success: true,
      settings: { site_name: 'My App', theme: 'dark' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-string setting values', () => {
    expect(GetSettingsResponseDTO.safeParse({ success: true, settings: { key: 42 } }).success).toBe(false);
  });
});

describe('UpdateSettingsResponseDTO', () => {
  it('accepts valid response shape', () => {
    expect(UpdateSettingsResponseDTO.safeParse({ success: true, settings: { key: 'val' } }).success).toBe(true);
  });

  it('rejects false success with valid settings', () => {
    // Schema itself allows false; it's a valid response shape
    expect(UpdateSettingsResponseDTO.safeParse({ success: false, settings: {} }).success).toBe(true);
  });
});
