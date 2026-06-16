import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TENANT_ID, mockSetting, makeSettingRepo, makeDs, setupSystemDs } from './setting.test-setup';
import SettingService from '../setting.service';
import { tenantDataSourceFor } from '@nb/db';
import redis from '@nb/redis';
import SettingMessages from '../setting.messages';

describe('SettingService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('upserts and returns the setting', async () => {
    const repo = makeSettingRepo(mockSetting);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    const result = await SettingService.create(TENANT_ID, 'site_name', 'My App', 'general', 'string');
    expect(result.key).toBe('site_name');
    // findOne returns an existing row, so create() takes the update path.
    expect(repo.update).toHaveBeenCalled();
  });

  it('invalidates the all-settings cache after creation', async () => {
    const repo = makeSettingRepo(mockSetting);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    await SettingService.create(TENANT_ID, 'site_name', 'My App');
    expect(redis.del).toHaveBeenCalled();
  });
});

describe('SettingService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('throws SETTING_NOT_FOUND when key does not exist', async () => {
    setupSystemDs(null);
    await expect(SettingService.update(TENANT_ID, 'nonexistent', 'value')).rejects.toThrow(SettingMessages.SETTING_NOT_FOUND);
  });

  it('updates value and returns updated setting', async () => {
    const repo = makeSettingRepo(mockSetting);
    repo.findOne
      .mockResolvedValueOnce(mockSetting)                               // exists check
      .mockResolvedValueOnce({ ...mockSetting, value: 'New Value' });   // after update
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    const result = await SettingService.update(TENANT_ID, 'site_name', 'New Value');
    expect(result.value).toBe('New Value');
  });

  it('invalidates cache after update', async () => {
    const repo = makeSettingRepo(mockSetting);
    repo.findOne.mockResolvedValue(mockSetting);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    await SettingService.update(TENANT_ID, 'site_name', 'Updated');
    expect(redis.del).toHaveBeenCalled();
  });
});

describe('SettingService.updateMany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('upserts all provided settings', async () => {
    const repo = makeSettingRepo(mockSetting);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    const result = await SettingService.updateMany(TENANT_ID, { site_name: 'App', theme: 'dark' });
    // Each key already exists (findOne returns a row), so both go via update.
    expect(repo.update).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('invalidates cache after batch update', async () => {
    const repo = makeSettingRepo(mockSetting);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    await SettingService.updateMany(TENANT_ID, { site_name: 'App' });
    expect(redis.del).toHaveBeenCalled();
  });
});

describe('SettingService.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns null when setting not found', async () => {
    setupSystemDs(null);
    const result = await SettingService.delete(TENANT_ID, 'nonexistent');
    expect(result).toBeNull();
  });

  it('deletes and returns the deleted setting', async () => {
    const repo = makeSettingRepo(mockSetting);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    const result = await SettingService.delete(TENANT_ID, 'site_name');
    expect(result?.key).toBe('site_name');
    expect(repo.delete).toHaveBeenCalledWith({ tenantId: TENANT_ID, key: 'site_name' });
  });

  it('invalidates cache after deletion', async () => {
    const repo = makeSettingRepo(mockSetting);
    (tenantDataSourceFor as any).mockResolvedValue(makeDs(repo));

    await SettingService.delete(TENANT_ID, 'site_name');
    expect(redis.del).toHaveBeenCalled();
  });
});
