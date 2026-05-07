import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    ping: vi.fn(async () => 'PONG'),
    mget: vi.fn(async (...keys: string[]) => new Array(keys.length).fill(null)),
  },
}));

vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import SettingService from './setting.service';
import { getSystemDataSource } from '@/libs/typeorm';
import redis from '@/libs/redis';
import SettingMessages from './setting.messages';

const mockSetting = {
  tenantId: '00000000-0000-0000-0000-000000000000',
  key: 'site_name',
  value: 'My App',
  group: 'general',
  type: 'string',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makeSettingRepo(setting: typeof mockSetting | null = mockSetting) {
  const findOne = vi.fn(async () => setting);
  const find = vi.fn(async () => (setting ? [setting] : []));
  const upsert = vi.fn(async () => {});
  const update = vi.fn(async () => {});
  const del = vi.fn(async () => {});
  return { findOne, find, upsert, update, delete: del };
}

function setupSystemDs(setting: typeof mockSetting | null = mockSetting) {
  const repo = makeSettingRepo(setting);
  (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

describe('SettingService.getAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns all settings from DB when cache is empty', async () => {
    setupSystemDs(mockSetting);
    const result = await SettingService.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('site_name');
  });

  it('returns parsed cached result when cache is populated', async () => {
    const cached = JSON.stringify([mockSetting]);
    (redis.get as any).mockResolvedValueOnce(cached);
    const result = await SettingService.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('site_name');
  });

  it('writes to cache after DB fetch', async () => {
    setupSystemDs(mockSetting);
    await SettingService.getAll();
    expect(redis.set).toHaveBeenCalled();
  });

  it('returns empty array when no settings exist', async () => {
    setupSystemDs(null);
    const result = await SettingService.getAll();
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
    const result = await SettingService.getByKey('unknown_key');
    expect(result).toBeNull();
  });

  it('returns setting when found in DB', async () => {
    setupSystemDs(mockSetting);
    const result = await SettingService.getByKey('site_name');
    expect(result?.key).toBe('site_name');
    expect(result?.value).toBe('My App');
  });

  it('returns setting from cache when available', async () => {
    (redis.get as any).mockResolvedValueOnce(JSON.stringify(mockSetting));
    const result = await SettingService.getByKey('site_name');
    expect(result?.key).toBe('site_name');
  });

  it('caches the result after DB fetch', async () => {
    setupSystemDs(mockSetting);
    await SettingService.getByKey('site_name');
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
    const value = await SettingService.getValue('site_name');
    expect(value).toBe('My App');
  });

  it('returns null when setting does not exist', async () => {
    setupSystemDs(null);
    const value = await SettingService.getValue('nonexistent');
    expect(value).toBeNull();
  });
});

describe('SettingService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('upserts and returns the setting', async () => {
    const repo = makeSettingRepo(mockSetting);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await SettingService.create('site_name', 'My App', 'general', 'string');
    expect(result.key).toBe('site_name');
    expect(repo.upsert).toHaveBeenCalled();
  });

  it('invalidates the all-settings cache after creation', async () => {
    const repo = makeSettingRepo(mockSetting);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    await SettingService.create('site_name', 'My App');
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
    await expect(SettingService.update('nonexistent', 'value')).rejects.toThrow(SettingMessages.SETTING_NOT_FOUND);
  });

  it('updates value and returns updated setting', async () => {
    const repo = makeSettingRepo(mockSetting);
    repo.findOne
      .mockResolvedValueOnce(mockSetting)                               // exists check
      .mockResolvedValueOnce({ ...mockSetting, value: 'New Value' });   // after update
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await SettingService.update('site_name', 'New Value');
    expect(result.value).toBe('New Value');
  });

  it('invalidates cache after update', async () => {
    const repo = makeSettingRepo(mockSetting);
    repo.findOne.mockResolvedValue(mockSetting);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    await SettingService.update('site_name', 'Updated');
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
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await SettingService.updateMany({ site_name: 'App', theme: 'dark' });
    expect(repo.upsert).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('invalidates cache after batch update', async () => {
    const repo = makeSettingRepo(mockSetting);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    await SettingService.updateMany({ site_name: 'App' });
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
    const result = await SettingService.delete('nonexistent');
    expect(result).toBeNull();
  });

  it('deletes and returns the deleted setting', async () => {
    const repo = makeSettingRepo(mockSetting);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await SettingService.delete('site_name');
    expect(result?.key).toBe('site_name');
    expect(repo.delete).toHaveBeenCalledWith({ key: 'site_name' });
  });

  it('invalidates cache after deletion', async () => {
    const repo = makeSettingRepo(mockSetting);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    await SettingService.delete('site_name');
    expect(redis.del).toHaveBeenCalled();
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
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });
    // Make cache miss so DB is queried
    const result = await SettingService.getAllAsRecord();
    expect(result['site_name']).toBe('My App');
    expect(result['logo_url']).toBe('https://example.com/logo.png');
  });
});

describe('SettingService.getByGroup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns settings that belong to the given group', async () => {
    const repo = makeSettingRepo(mockSetting);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });

    const result = await SettingService.getByGroup('general');
    expect(result).toHaveLength(1);
    expect(result[0].group).toBe('general');
  });

  it('returns empty array when no settings in group', async () => {
    const repo = makeSettingRepo(null);
    (getSystemDataSource as any).mockResolvedValue({ getRepository: () => repo });
    const result = await SettingService.getByGroup('nonexistent');
    expect(result).toHaveLength(0);
  });
});
