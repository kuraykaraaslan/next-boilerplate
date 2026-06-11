import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/modules/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@/modules/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    ping: vi.fn(async () => 'PONG'),
    mget: vi.fn(async () => []),
    incrby: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    exists: vi.fn(async () => 0),
  },
  singleFlight: async (_key: string, fn: () => Promise<unknown>) => fn(),
  jitter: (n: number) => n,
}));
vi.mock('@/modules/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));


// Bypass feature gating in unit tests — tested separately in tenant_subscription/.
// (The gate lives in tenant_subscription.feature.service after the service split.)
vi.mock('@/modules/tenant_subscription/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
// Webhook dispatch, audit logging and settings reads are side-effects of the
// service — stub them so unit tests stay focused on api_key behaviour.
vi.mock('@/modules/webhook/webhook.service', () => ({ default: { dispatchEvent: vi.fn(async () => {}) } }));
vi.mock('@/modules/audit_log/audit_log.service', () => ({ default: { log: vi.fn(async () => {}) } }));
vi.mock('@/modules/setting/setting.service', () => ({
  default: { getValue: vi.fn(async () => null), getByKeys: vi.fn(async () => ({})) },
}));
import SettingService from '@/modules/setting/setting.service';
import ApiKeyService from '../api_key.service';
import { tenantDataSourceFor, getDataSource } from '@/modules/db';
import ApiKeyMessages from '../api_key.messages';

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
  scopes: ['read'] as ('read' | 'write' | 'admin')[],
  keyEnv: 'live',
  ipAllowlist: [] as string[],
  isActive: true,
  lastUsedAt: null,
  lastUsedIp: null as string | null,
  usageCount: 0,
  successorKeyId: null as string | null,
  expiresAt: null as Date | null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makeMockRepo(row: typeof mockApiKey | null = mockApiKey) {
  const findOne = vi.fn(async () => row);
  const find = vi.fn(async () => (row ? [row] : []));
  const findAndCount = vi.fn(async () => [row ? [row] : [], row ? 1 : 0] as const);
  const count = vi.fn(async () => (row ? 1 : 0));
  const create = vi.fn((data: any) => ({ ...mockApiKey, ...data }));
  const save = vi.fn(async (entity: any) => ({ ...mockApiKey, ...entity }));
  const remove = vi.fn(async () => {});
  const update = vi.fn(async () => {});
  const increment = vi.fn(async () => {});
  // Minimal query-builder used by sweepExpired().
  const createQueryBuilder = vi.fn(() => {
    const qb: any = {};
    for (const m of ['where', 'andWhere', 'orderBy']) qb[m] = vi.fn(() => qb);
    qb.getMany = vi.fn(async () => (row ? [row] : []));
    return qb;
  });
  return { findOne, find, findAndCount, count, create, save, remove, update, increment, createQueryBuilder };
}

function setupTenantDs(row: typeof mockApiKey | null = mockApiKey) {
  const repo = makeMockRepo(row);
  (tenantDataSourceFor as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

function setupDefaultTenantDs(row: typeof mockApiKey | null = mockApiKey) {
  const repo = makeMockRepo(row);
  (getDataSource as any).mockResolvedValue({ getRepository: () => repo });
  return repo;
}

describe('ApiKeyService.generateRawKey', () => {
  it('honours an explicit live environment prefix', () => {
    const key = ApiKeyService.generateRawKey(TENANT_ID, 'live');
    expect(key).toMatch(/^sk_live_/);
  });

  it('honours an explicit test environment prefix', () => {
    const key = ApiKeyService.generateRawKey(TENANT_ID, 'test');
    expect(key).toMatch(/^sk_test_/);
  });

  it('defaults the prefix to the deployment environment (test → sk_test_)', () => {
    // env mock above pins NODE_ENV to 'test'.
    const key = ApiKeyService.generateRawKey(TENANT_ID);
    expect(key).toMatch(/^sk_test_/);
  });

  it('includes tenant prefix segment', () => {
    const key = ApiKeyService.generateRawKey(TENANT_ID, 'live');
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
    // Prefix follows the deployment environment (test env → sk_test_).
    expect(result.rawKey).toMatch(/^sk_(live|test)_/);
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

describe('ApiKeyService.create — tenant policy enforcement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects creation when the active-key limit is reached', async () => {
    setupTenantDs(mockApiKey); // count() → 1
    (SettingService.getByKeys as any).mockResolvedValueOnce({ apiKeyMaxActiveKeys: '1' });
    await expect(
      ApiKeyService.create(TENANT_ID, USER_ID, { name: 'k', scopes: ['read'] }),
    ).rejects.toThrow(ApiKeyMessages.MAX_KEYS_REACHED);
  });

  it('rejects a non-expiring key when the tenant requires expiry', async () => {
    setupTenantDs(mockApiKey);
    (SettingService.getByKeys as any).mockResolvedValueOnce({ apiKeyRequireExpiry: 'true' });
    await expect(
      ApiKeyService.create(TENANT_ID, USER_ID, { name: 'k', scopes: ['read'] }),
    ).rejects.toThrow(ApiKeyMessages.EXPIRY_REQUIRED);
  });

  it('rejects an expiry beyond the tenant maximum TTL', async () => {
    setupTenantDs(mockApiKey);
    (SettingService.getByKeys as any).mockResolvedValueOnce({ apiKeyMaxTtlDays: '1' });
    const farFuture = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    await expect(
      ApiKeyService.create(TENANT_ID, USER_ID, { name: 'k', scopes: ['read'], expiresAt: farFuture }),
    ).rejects.toThrow(ApiKeyMessages.TTL_EXCEEDS_MAX);
  });

  it('persists a per-key IP allowlist', async () => {
    const repo = setupTenantDs(mockApiKey);
    await ApiKeyService.create(TENANT_ID, USER_ID, {
      name: 'k', scopes: ['read'], ipAllowlist: ['10.0.0.0/8'],
    });
    expect(repo.create.mock.calls[0][0].ipAllowlist).toEqual(['10.0.0.0/8']);
  });
});

describe('ApiKeyService.verify — IP allowlist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a key used from an IP outside its allowlist', async () => {
    setupDefaultTenantDs({ ...mockApiKey, ipAllowlist: ['10.0.0.0/8'] });
    await expect(
      ApiKeyService.verify('sk_live_somekey', undefined, { ip: '203.0.113.5' }),
    ).rejects.toThrow(ApiKeyMessages.IP_NOT_ALLOWED);
  });

  it('accepts a key used from an IP inside its CIDR allowlist', async () => {
    setupDefaultTenantDs({ ...mockApiKey, ipAllowlist: ['10.0.0.0/8'] });
    const result = await ApiKeyService.verify('sk_live_somekey', undefined, { ip: '10.1.2.3' });
    expect(result.apiKeyId).toBe(KEY_ID);
  });
});

describe('ApiKeyService.rotate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mints a successor and deactivates the old key when graceSeconds = 0', async () => {
    const repo = setupTenantDs({ ...mockApiKey });
    const { key, rawKey } = await ApiKeyService.rotate(TENANT_ID, KEY_ID, USER_ID, { graceSeconds: 0 });
    expect(rawKey).toMatch(/^sk_(live|test)_/);
    expect(key.apiKeyId).toBeDefined();
    // Second save is the old key, now deactivated and pointing at its successor.
    const oldSaved = repo.save.mock.calls[1][0];
    expect(oldSaved.isActive).toBe(false);
    expect(oldSaved.successorKeyId).toBeDefined();
  });

  it('grace-expires the old key when graceSeconds > 0', async () => {
    const repo = setupTenantDs({ ...mockApiKey });
    await ApiKeyService.rotate(TENANT_ID, KEY_ID, USER_ID, { graceSeconds: 3600 });
    const oldSaved = repo.save.mock.calls[1][0];
    expect(oldSaved.isActive).toBe(true);
    expect(oldSaved.expiresAt).toBeInstanceOf(Date);
  });
});

describe('ApiKeyService.revokeAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deactivates all active keys and returns the count', async () => {
    const repo = setupTenantDs(mockApiKey); // find() → [mockApiKey]
    const count = await ApiKeyService.revokeAll(TENANT_ID, USER_ID);
    expect(count).toBe(1);
    expect(repo.update).toHaveBeenCalledWith(
      { tenantId: TENANT_ID, isActive: true },
      { isActive: false },
    );
  });

  it('returns 0 when there are no active keys', async () => {
    setupTenantDs(null); // find() → []
    expect(await ApiKeyService.revokeAll(TENANT_ID)).toBe(0);
  });
});

describe('ApiKeyService.sweepExpired', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deactivates expired-but-active keys and returns the count', async () => {
    const repo = setupTenantDs({ ...mockApiKey, expiresAt: new Date('2000-01-01') });
    const count = await ApiKeyService.sweepExpired(TENANT_ID);
    expect(count).toBe(1);
    expect(repo.save.mock.calls[0][0].isActive).toBe(false);
  });
});
