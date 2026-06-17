import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@kuraykaraaslan/db', () => ({
  getDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
}));

vi.mock('@kuraykaraaslan/redis', () => ({
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
vi.mock('@kuraykaraaslan/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@kuraykaraaslan/webhook/server/webhook.service', () => ({ default: { dispatchEvent: vi.fn(async () => {}) } }));
vi.mock('@kuraykaraaslan/audit_log/server/audit_log.service', () => ({ default: { log: vi.fn(async () => {}) } }));
vi.mock('@kuraykaraaslan/setting/server/setting.service', () => ({
  default: { getValue: vi.fn(async () => null), getByKeys: vi.fn(async () => ({})) },
}));
import ApiKeyService from '../api_key.service';
import { TENANT_ID, USER_ID, KEY_ID, mockApiKey, setupTenantDs } from './api_key.test-utils';

describe('api_key.rotation.rotate', () => {
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

describe('api_key.rotation.revokeAll', () => {
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

describe('api_key.rotation.sweepExpired', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deactivates expired-but-active keys and returns the count', async () => {
    const repo = setupTenantDs({ ...mockApiKey, expiresAt: new Date('2000-01-01') });
    const count = await ApiKeyService.sweepExpired(TENANT_ID);
    expect(count).toBe(1);
    expect(repo.save.mock.calls[0][0].isActive).toBe(false);
  });
});
