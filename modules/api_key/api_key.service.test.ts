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
  tenantDataSourceFor: vi.fn(),
  getDefaultTenantDataSource: vi.fn(),
}));

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import ApiKeyService from './api_key.service';
import { tenantDataSourceFor, getDefaultTenantDataSource } from '@/libs/typeorm';
import ApiKeyMessages from './api_key.messages';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const KEY_ID = '770e8400-e29b-41d4-a716-446655440002';

const mockApiKey = {
  apiKeyId: KEY_ID,
  tenantId: TENANT_ID,
  createdByUserId: USER_ID,
  name: 'Test Key',
  description: null,
  keyHash: 'abc123hash',
  keyPrefix: 'sk_live_abcd1234_5',
  scopes: ['read'] as const,
  isActive: true,
  lastUsedAt: null,
  expiresAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makeMockRepo(row: typeof mockApiKey | null = mockApiKey) {
  const findOne = vi.fn(async () => row);
  const find = vi.fn(async () => (row ? [row] : []));
  const findAndCount = vi.fn(async () => [row ? [row] : [], row ? 1 : 0] as const);
  const create = vi.fn((data: any) => ({ ...mockApiKey, ...data }));
  const save = vi.fn(async (entity: any) => ({ ...mockApiKey, ...entity }));
  const remove = vi.fn(async () => {});
  const update = vi.fn(async () => {});
  return { findOne, find, findAndCount, create, save, remove, update };
}

function setupTenantDs(row: typeof mockApiKey | null = mockApiKey) {
  const repo = makeMockRepo(row);
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

function setupDefaultTenantDs(row: typeof mockApiKey | null = mockApiKey) {
  const repo = makeMockRepo(row);
  (getDefaultTenantDataSource as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

describe('ApiKeyService.generateRawKey', () => {
  it('returns a key with sk_live_ prefix', () => {
    const key = ApiKeyService.generateRawKey(TENANT_ID);
    expect(key).toMatch(/^sk_live_/);
  });

  it('includes tenant prefix segment', () => {
    const key = ApiKeyService.generateRawKey(TENANT_ID);
    // Tenant ID without dashes: "550e8400e29b41d4a716446655440000" → first 8 chars = "550e8400"
    expect(key).toContain('550e8400');
  });
});

describe('ApiKeyService.hashKey', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = ApiKeyService.hashKey('sk_live_test_key');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same hash for the same key', () => {
    const key = 'sk_live_deterministic';
    expect(ApiKeyService.hashKey(key)).toBe(ApiKeyService.hashKey(key));
  });

  it('produces different hashes for different keys', () => {
    expect(ApiKeyService.hashKey('key_a')).not.toBe(ApiKeyService.hashKey('key_b'));
  });
});

describe('ApiKeyService.extractPrefix', () => {
  it('returns the first 20 characters', () => {
    const key = 'sk_live_abcd1234_deadbeefcafebabe1234';
    expect(ApiKeyService.extractPrefix(key)).toBe(key.slice(0, 20));
  });
});

describe('ApiKeyService.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns keys and total', async () => {
    const repo = makeMockRepo(mockApiKey);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });

    const result = await ApiKeyService.list({ tenantId: TENANT_ID, page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.keys).toHaveLength(1);
    expect(result.keys[0].apiKeyId).toBe(KEY_ID);
  });

  it('does not expose keyHash in returned keys', async () => {
    setupTenantDs(mockApiKey);
    const result = await ApiKeyService.list({ tenantId: TENANT_ID, page: 1, pageSize: 20 });
    expect((result.keys[0] as any).keyHash).toBeUndefined();
  });
});

describe('ApiKeyService.getById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when key does not exist', async () => {
    setupTenantDs(null);
    await expect(ApiKeyService.getById(TENANT_ID, KEY_ID)).rejects.toThrow(ApiKeyMessages.NOT_FOUND);
  });

  it('returns SafeApiKey on success', async () => {
    setupTenantDs(mockApiKey);
    const result = await ApiKeyService.getById(TENANT_ID, KEY_ID);
    expect(result.apiKeyId).toBe(KEY_ID);
    expect((result as any).keyHash).toBeUndefined();
  });
});

describe('ApiKeyService.create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the created key and its rawKey', async () => {
    setupTenantDs(mockApiKey);
    const result = await ApiKeyService.create(TENANT_ID, USER_ID, {
      name: 'New Key',
      scopes: ['read'],
    });
    expect(result.rawKey).toMatch(/^sk_live_/);
    expect(result.key.name).toBeDefined();
    expect((result.key as any).keyHash).toBeUndefined();
  });

  it('sets isActive true on creation', async () => {
    const repo = makeMockRepo(mockApiKey);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    await ApiKeyService.create(TENANT_ID, USER_ID, { name: 'Key', scopes: ['write'] });
    const createCall = repo.create.mock.calls[0][0];
    expect(createCall.isActive).toBe(true);
  });
});

describe('ApiKeyService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when key does not exist', async () => {
    setupTenantDs(null);
    await expect(ApiKeyService.update(TENANT_ID, KEY_ID, { name: 'New' })).rejects.toThrow(ApiKeyMessages.NOT_FOUND);
  });

  it('updates name and returns updated key', async () => {
    const repo = makeMockRepo({ ...mockApiKey, name: 'Updated' });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    const result = await ApiKeyService.update(TENANT_ID, KEY_ID, { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('can deactivate a key', async () => {
    const repo = makeMockRepo({ ...mockApiKey, isActive: false });
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    const result = await ApiKeyService.update(TENANT_ID, KEY_ID, { isActive: false });
    expect(result.isActive).toBe(false);
  });
});

describe('ApiKeyService.delete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws NOT_FOUND when key does not exist', async () => {
    setupTenantDs(null);
    await expect(ApiKeyService.delete(TENANT_ID, KEY_ID)).rejects.toThrow(ApiKeyMessages.NOT_FOUND);
  });

  it('calls repo.remove when key exists', async () => {
    const repo = makeMockRepo(mockApiKey);
    (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
    await ApiKeyService.delete(TENANT_ID, KEY_ID);
    expect(repo.remove).toHaveBeenCalledWith(expect.objectContaining({ apiKeyId: KEY_ID }));
  });
});

describe('ApiKeyService.verify', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws INVALID_KEY when no matching key found', async () => {
    setupDefaultTenantDs(null);
    await expect(ApiKeyService.verify('sk_live_invalid')).rejects.toThrow(ApiKeyMessages.INVALID_KEY);
  });

  it('throws KEY_INACTIVE for inactive keys', async () => {
    setupDefaultTenantDs({ ...mockApiKey, isActive: false });
    await expect(ApiKeyService.verify('sk_live_somekey')).rejects.toThrow(ApiKeyMessages.KEY_INACTIVE);
  });

  it('throws KEY_EXPIRED for expired keys', async () => {
    setupDefaultTenantDs({ ...mockApiKey, expiresAt: new Date('2000-01-01') });
    await expect(ApiKeyService.verify('sk_live_somekey')).rejects.toThrow(ApiKeyMessages.KEY_EXPIRED);
  });

  it('throws INSUFFICIENT_SCOPE when required scope is missing', async () => {
    setupDefaultTenantDs({ ...mockApiKey, scopes: ['read'] });
    await expect(ApiKeyService.verify('sk_live_somekey', 'admin')).rejects.toThrow(ApiKeyMessages.INSUFFICIENT_SCOPE);
  });

  it('returns SafeApiKey when key is valid and scope matches', async () => {
    setupDefaultTenantDs({ ...mockApiKey, scopes: ['read', 'write'] });
    const result = await ApiKeyService.verify('sk_live_somekey', 'read');
    expect(result.apiKeyId).toBe(KEY_ID);
    expect((result as any).keyHash).toBeUndefined();
  });
});
