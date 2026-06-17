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
import ApiKeyMessages from '../api_key.messages';
import { KEY_ID, mockApiKey, setupDefaultTenantDs } from './api_key.test-utils';

describe('api_key.verify.verify', () => {
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

describe('api_key.verify.verify — IP allowlist', () => {
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
