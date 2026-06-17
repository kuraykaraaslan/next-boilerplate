import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, mockSetting, makeSettingRepo, makeDs, setupSystemDs } from './setting.test-setup';
import SettingService from '../setting.service';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import redis from '@kuraykaraaslan/redis';

describe('SettingService.getAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns all settings from DB when cache is empty', async () => {
    setupSystemDs(mockSetting);
    const result = await SettingService.getAll(TENANT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('site_name');
  });

  it('returns parsed cached result when cache is populated', async () => {
    const cached = JSON.stringify([mockSetting]);
    (redis.get as any).mockResolvedValueOnce(cached);
    const result = await SettingService.getAll(TENANT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('site_name');
  });

  it('writes to cache after DB fetch', async () => {
    setupSystemDs(mockSetting);
    await SettingService.getAll(TENANT_ID);
    expect(redis.set).toHaveBeenCalled();
  });

  it('returns empty array when no settings exist', async () => {
    setupSystemDs(null);
    const result = await SettingService.getAll(TENANT_ID);
    expect(result).toHaveLength(0);
  });
});

describe('SettingService.getByKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns null when setting not found', async () => {
    setupSystemDs(null);
    const result = await SettingService.getByKey(TENANT_ID, 'unknown_key');
    expect(result).toBeNull();
  });

  it('returns setting when found in DB', async () => {
    setupSystemDs(mockSetting);
    const result = await SettingService.getByKey(TENANT_ID, 'site_name');
    expect(result?.key).toBe('site_name');
    expect(result?.value).toBe('My App');
  });

  it('returns setting from cache when available', async () => {
    (redis.get as any).mockResolvedValueOnce(JSON.stringify(mockSetting));
    const result = await SettingService.getByKey(TENANT_ID, 'site_name');
    expect(result?.key).toBe('site_name');
  });

  it('caches the result after DB fetch', async () => {
    setupSystemDs(mockSetting);
    await SettingService.getByKey(TENANT_ID, 'site_name');
    expect(redis.set).toHaveBeenCalled();
  });
});

describe('SettingService.getValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns value string when setting exists', async () => {
    setupSystemDs(mockSetting);
    const value = await SettingService.getValue(TENANT_ID, 'site_name');
    expect(value).toBe('My App');
  });

  it('returns null when setting does not exist', async () => {
    setupSystemDs(null);
    const value = await SettingService.getValue(TENANT_ID, 'nonexistent');
    expect(value).toBeNull();
  });
});

describe('SettingService.getAllAsRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns a record mapping key to value', async () => {
    const twoSettings = [
      mockSetting,
      { ...mockSetting, key: 'logo_url', value: 'https://example.com/logo.png' },
    ];
    const repo = makeSettingRepo(mockSetting);
    repo.find.mockResolvedValue(twoSettings);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));
    // Make cache miss so DB is queried
    const result = await SettingService.getAllAsRecord(TENANT_ID);
    expect(result['site_name']).toBe('My App');
    expect(result['logo_url']).toBe('https://example.com/logo.png');
  });
});

describe('SettingService.getByGroup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns settings that belong to the given group', async () => {
    const repo = makeSettingRepo(mockSetting);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    const result = await SettingService.getByGroup(TENANT_ID, 'general');
    expect(result).toHaveLength(1);
    expect(result[0].group).toBe('general');
  });

  it('returns empty array when no settings in group', async () => {
    const repo = makeSettingRepo(null);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));
    const result = await SettingService.getByGroup(TENANT_ID, 'nonexistent');
    expect(result).toHaveLength(0);
  });
});
