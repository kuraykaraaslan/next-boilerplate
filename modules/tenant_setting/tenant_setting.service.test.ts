import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    SESSION_TTL_SECONDS: 3600,
    REFRESH_TOKEN_TTL_SECONDS: 86400,
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    ping: vi.fn(),
    keys: vi.fn(async () => []),
    mget: vi.fn(async () => []),
  },
}));

vi.mock('@/libs/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/modules/setting/setting.service', () => ({
  default: { getValue: vi.fn(async () => null) },
}));

import TenantSettingService from './tenant_setting.service';
import { tenantDataSourceFor } from '@/libs/typeorm';
import redis from '@/libs/redis';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = '00000000-0000-1000-8000-000000000010';

const now = new Date();

const mockSettingEntity = {
  tenantId: TENANT_ID,
  key: 'siteTitle',
  value: 'My App',
  group: 'general',
  type: 'string',
  createdAt: now,
  updatedAt: now,
};

// ─── Helper to wire up tenantDataSourceFor ───────────────────────────────────

function makeMockRepo(overrides: Partial<{
  findOne: any;
  find: any;
  save: any;
  create: any;
  update: any;
  delete: any;
}> = {}) {
  const repo = {
    findOne: vi.fn(async () => mockSettingEntity),
    find: vi.fn(async () => [mockSettingEntity]),
    save: vi.fn(async (e: any) => ({ ...mockSettingEntity, ...e })),
    create: vi.fn((data: any) => ({ ...mockSettingEntity, ...data })),
    update: vi.fn(async () => ({ affected: 1 })),
    delete: vi.fn(async () => ({ affected: 1 })),
    ...overrides,
  };

  (tenantDataSourceFor as any).mockResolvedValue({
    getRepository: () => repo,
  });

  return repo;
}

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('TenantSettingService.getAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
    (redis.set as any).mockResolvedValue('OK');
  });

  it('returns settings from DB when cache is cold', async () => {
    makeMockRepo();
    const result = await TenantSettingService.getAll(TENANT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('siteTitle');
  });

  it('returns parsed result from cache when cache is warm', async () => {
    (redis.get as any).mockResolvedValue(JSON.stringify([mockSettingEntity]));
    const result = await TenantSettingService.getAll(TENANT_ID);
    expect(result[0].key).toBe('siteTitle');
    expect(tenantDataSourceFor).not.toHaveBeenCalled();
  });
});

// ─── getByKey ─────────────────────────────────────────────────────────────────

describe('TenantSettingService.getByKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns null when setting does not exist', async () => {
    makeMockRepo({ findOne: vi.fn(async () => null) });
    const result = await TenantSettingService.getByKey(TENANT_ID, 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns setting from DB on cache miss', async () => {
    makeMockRepo();
    const result = await TenantSettingService.getByKey(TENANT_ID, 'siteTitle');
    expect(result?.value).toBe('My App');
  });
});

// ─── getValue ─────────────────────────────────────────────────────────────────

describe('TenantSettingService.getValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
  });

  it('returns null when key is not found', async () => {
    makeMockRepo({ findOne: vi.fn(async () => null) });
    const result = await TenantSettingService.getValue(TENANT_ID, 'missing');
    expect(result).toBeNull();
  });

  it('returns the string value when key exists', async () => {
    makeMockRepo();
    const result = await TenantSettingService.getValue(TENANT_ID, 'siteTitle');
    expect(result).toBe('My App');
  });
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('TenantSettingService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
    (redis.set as any).mockResolvedValue('OK');
    (redis.del as any).mockResolvedValue(1);
  });

  it('creates a new setting when key does not exist', async () => {
    const repo = makeMockRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(null) // existence check
        .mockResolvedValueOnce({ ...mockSettingEntity, key: 'newKey', value: 'newVal' }), // after create
    });
    const result = await TenantSettingService.create(TENANT_ID, 'newKey', 'newVal');
    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect(result.key).toBe('newKey');
  });

  it('updates an existing setting when key already exists', async () => {
    const updatedSetting = { ...mockSettingEntity, value: 'updatedValue' };
    const repo = makeMockRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockSettingEntity) // existence check
        .mockResolvedValueOnce(updatedSetting),   // after update
    });
    const result = await TenantSettingService.create(TENANT_ID, 'siteTitle', 'updatedValue');
    expect(repo.update).toHaveBeenCalled();
    expect(result.value).toBe('updatedValue');
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('TenantSettingService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
    (redis.set as any).mockResolvedValue('OK');
    (redis.del as any).mockResolvedValue(1);
  });

  it('throws "Setting not found" when key does not exist', async () => {
    makeMockRepo({ findOne: vi.fn(async () => null) });
    await expect(TenantSettingService.update(TENANT_ID, 'missing', 'val')).rejects.toThrow('Setting not found');
  });

  it('updates and returns the setting', async () => {
    const updatedSetting = { ...mockSettingEntity, value: 'changed' };
    makeMockRepo({
      findOne: vi.fn()
        .mockResolvedValueOnce(mockSettingEntity)
        .mockResolvedValueOnce(updatedSetting),
    });
    const result = await TenantSettingService.update(TENANT_ID, 'siteTitle', 'changed');
    expect(result.value).toBe('changed');
  });
});

// ─── delete ──────────────────────────────────────────────────────────────────

describe('TenantSettingService.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.del as any).mockResolvedValue(1);
  });

  it('returns null when setting does not exist', async () => {
    makeMockRepo({ findOne: vi.fn(async () => null) });
    const result = await TenantSettingService.delete(TENANT_ID, 'missing');
    expect(result).toBeNull();
  });

  it('deletes the setting and returns parsed data', async () => {
    const repo = makeMockRepo();
    const result = await TenantSettingService.delete(TENANT_ID, 'siteTitle');
    expect(repo.delete).toHaveBeenCalled();
    expect(result?.key).toBe('siteTitle');
  });
});

// ─── getAllAsRecord ───────────────────────────────────────────────────────────

describe('TenantSettingService.getAllAsRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis.get as any).mockResolvedValue(null);
    (redis.set as any).mockResolvedValue('OK');
  });

  it('returns a key-value record', async () => {
    makeMockRepo();
    const result = await TenantSettingService.getAllAsRecord(TENANT_ID);
    expect(result).toMatchObject({ siteTitle: 'My App' });
  });
});

// ─── getByGroup ───────────────────────────────────────────────────────────────

describe('TenantSettingService.getByGroup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns settings filtered by group', async () => {
    makeMockRepo();
    const result = await TenantSettingService.getByGroup(TENANT_ID, 'general');
    expect(result).toHaveLength(1);
    expect(result[0].group).toBe('general');
  });
});
