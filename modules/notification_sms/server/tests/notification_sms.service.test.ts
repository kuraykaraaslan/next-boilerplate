import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEST_TENANT_ID = '00000000-0000-4000-8000-000000000000';

vi.mock('@kuraykaraaslan/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '587',
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'test',
    SMS_RATE_LIMIT_SECONDS: 60,
    SMS_DEFAULT_PROVIDER: 'twilio',
    APPLICATION_NAME: 'Test App',
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

vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    add = vi.fn(async () => ({ id: 'job-1' }));
    close = vi.fn();
  },
  Worker: class MockWorker {
    on = vi.fn();
    close = vi.fn();
  },
  Job: class MockJob {},
}));

vi.mock('@kuraykaraaslan/redis/server/redis.bullmq', () => ({
  getBullMQConnection: vi.fn(() => ({})),
}));

vi.mock('@kuraykaraaslan/setting/server/setting.service', () => ({
  default: {
    getValue: vi.fn(async () => null),
    getByKeys: vi.fn(async () => ({})),
  },
}));

// Providers now live in satellite modules discovered through the extension
// registry (point `sms:provider`), gated by the tenant's enabled modules.
function mockSmsProvider(key: string) {
  return {
    name: key,
    async isConfigured(_tenantId: string) { return true; },
    async sendShortMessage(_tenantId: string, _opts: { to: string; body: string }) { return { success: true }; },
  };
}
const SMS_CONTRIBS = ['twilio', 'netgsm', 'clickatell', 'nexmo'].map((key) => ({
  id: `sms_${key}:sms:provider:${key}`, point: 'sms:provider', moduleId: `sms_${key}`, key, metadata: {},
}));

vi.mock('@kuraykaraaslan/setting/server/module-activation.service.next', () => ({
  getEnabledModuleIds: vi.fn(async () => new Set(SMS_CONTRIBS.map((c) => c.moduleId).concat('notification_sms'))),
}));

vi.mock('@kuraykaraaslan/common/server/extension-registry', () => ({
  extensionRegistry: {
    getContributions: (point: string, filter?: { enabledIds?: Set<string> }) =>
      point === 'sms:provider'
        ? SMS_CONTRIBS.filter((c) => !filter?.enabledIds || filter.enabledIds.has(c.moduleId))
        : [],
    load: async (ext: { key: string }) => mockSmsProvider(ext.key),
  },
}));


// Bypass feature gating in unit tests — tested separately in tenant_subscription/.
vi.mock('@kuraykaraaslan/tenant_subscription/server/tenant_subscription.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
import SMSService from '../notification_sms.service';
import redis from '@kuraykaraaslan/redis';

const mockRedis = redis as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockRedis.get.mockResolvedValue(null);
  mockRedis.set.mockResolvedValue('OK');
});

describe('SMSService.parsePhoneNumber', () => {
  it('parses a valid US phone number', () => {
    const result = SMSService.parsePhoneNumber('+12025551234');
    expect(result).not.toBeNull();
    expect(result?.regionCode).toBe('US');
    expect(result?.number).toBe('+12025551234');
  });

  it('parses a valid Turkish phone number', () => {
    const result = SMSService.parsePhoneNumber('+905551234567');
    expect(result).not.toBeNull();
    expect(result?.regionCode).toBe('TR');
  });

  it('returns null for an invalid phone number', () => {
    const result = SMSService.parsePhoneNumber('not-a-phone');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', () => {
    const result = SMSService.parsePhoneNumber('');
    expect(result).toBeNull();
  });
});

describe('SMSService.isValidPhoneNumber', () => {
  it('returns true for a valid number', () => {
    expect(SMSService.isValidPhoneNumber('+12025551234')).toBe(true);
  });

  it('returns false for an invalid number', () => {
    expect(SMSService.isValidPhoneNumber('12345')).toBe(false);
  });
});

describe('SMSService.isAllowedCountry', () => {
  it('allows all countries when ALLOWED_COUNTRIES is not set', () => {
    expect(SMSService.isAllowedCountry('TR')).toBe(true);
    expect(SMSService.isAllowedCountry('US')).toBe(true);
    expect(SMSService.isAllowedCountry('XX')).toBe(true);
  });
});

describe('SMSService.getProvider', () => {
  it('returns twilio when asked', async () => {
    const provider = await SMSService.getProvider(TEST_TENANT_ID, 'twilio');
    expect(provider).toBeDefined();
  });

  it('falls back to default when unknown provider name is given', async () => {
    const provider = await SMSService.getProvider(TEST_TENANT_ID, 'unknown' as any);
    expect(provider).toBeDefined();
  });
});

describe('SMSService.listProviders', () => {
  it('returns all 4 provider types with configured state', async () => {
    const providers = await SMSService.listProviders(TEST_TENANT_ID);
    const names = providers.map((p) => p.name);
    expect(names).toContain('twilio');
    expect(names).toContain('netgsm');
    expect(names).toContain('clickatell');
    expect(names).toContain('nexmo');
    expect(providers).toHaveLength(4);
    for (const p of providers) expect(typeof p.configured).toBe('boolean');
  });
});

describe('SMSService.getRegionProviderMap', () => {
  it('includes default region mappings', () => {
    const map = SMSService.getRegionProviderMap();
    expect(map).toHaveProperty('TR');
    expect(map['TR']).toBe('netgsm');
    expect(map).toHaveProperty('US');
    expect(map['US']).toBe('twilio');
  });
});

describe('SMSService.getProviderForRegion', () => {
  it('returns netgsm for TR region', async () => {
    const provider = await SMSService.getProviderForRegion(TEST_TENANT_ID, 'TR');
    expect(provider).toBeDefined();
  });

  it('returns twilio for US region', async () => {
    const provider = await SMSService.getProviderForRegion(TEST_TENANT_ID, 'US');
    expect(provider).toBeDefined();
  });

  it('returns default provider for unknown region', async () => {
    const provider = await SMSService.getProviderForRegion(TEST_TENANT_ID, 'ZZ');
    expect(provider).toBeDefined();
  });
});

describe('SMSService.sendShortMessage', () => {
  it('does not queue when phone number is empty', async () => {
    await SMSService.sendShortMessage(TEST_TENANT_ID, { to: '', body: 'Hello' });
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('does not queue when body is empty', async () => {
    await SMSService.sendShortMessage(TEST_TENANT_ID, { to: '+12025551234', body: '' });
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('does not queue when rate limit is active for the number', async () => {
    mockRedis.get.mockResolvedValue('1');
    await SMSService.sendShortMessage(TEST_TENANT_ID, { to: '+12025551234', body: 'Hello' });
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('queues SMS when phone and body are valid and no rate limit', async () => {
    mockRedis.get.mockResolvedValue(null);

    const queueAddSpy = vi.spyOn(SMSService.QUEUE as any, 'add');

    await SMSService.sendShortMessage(TEST_TENANT_ID, { to: '+12025551234', body: 'Hello World' });

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('+12025551234'),
      '1',
      'EX',
      60
    );
    expect(queueAddSpy).toHaveBeenCalledWith(
      'sendShortMessage',
      expect.objectContaining({ tenantId: TEST_TENANT_ID, to: '+12025551234', body: 'Hello World' })
    );
  });
});

describe('SMSService.sendShortMessageDirect', () => {
  it('does not throw for a valid number and body', async () => {
    await expect(
      SMSService.sendShortMessageDirect(TEST_TENANT_ID, { to: '+12025551234', body: 'Direct message' })
    ).resolves.not.toThrow();
  });

  it('does not throw for an invalid number (logs error gracefully)', async () => {
    await expect(
      SMSService.sendShortMessageDirect(TEST_TENANT_ID, { to: 'invalid', body: 'Direct message' })
    ).resolves.not.toThrow();
  });
});
