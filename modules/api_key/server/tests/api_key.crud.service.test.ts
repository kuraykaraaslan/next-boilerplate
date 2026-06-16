import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@nb/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@nb/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@nb/redis', () => ({
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
vi.mock('@nb/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

// Bypass feature gating in unit tests — tested separately in tenant_subscription/.
vi.mock('@nb/tenant_subscription/server/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
// Webhook dispatch, audit logging and settings reads are side-effects of the
// service — stub them so unit tests stay focused on api_key behaviour.
vi.mock('@nb/webhook/server/webhook.service', () => ({ default: { dispatchEvent: vi.fn(async () => {}) } }));
vi.mock('@nb/audit_log/server/audit_log.service', () => ({ default: { log: vi.fn(async () => {}) } }));
vi.mock('@nb/setting/server/setting.service', () => ({
  default: { getValue: vi.fn(async () => null), getByKeys: vi.fn(async () => ({})) },
}));
import SettingService from '@nb/setting/server/setting.service';
import ApiKeyService from '../api_key.service';
import { tenantDataSourceFor } from '@nb/db';
import ApiKeyMessages from '../api_key.messages';
import { TENANT_ID, USER_ID, KEY_ID, mockApiKey, makeMockRepo, setupTenantDs } from './api_key.test-utils';

describe('api_key.crud.list', () => {
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

describe('api_key.crud.getById', () => {
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

describe('api_key.crud.create', () => {
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

describe('api_key.crud.create — tenant policy enforcement', () => {
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

describe('api_key.crud.update', () => {
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

describe('api_key.crud.delete', () => {
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
