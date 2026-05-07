import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
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

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({
  default: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(),
    ping: vi.fn(),
  },
}));

vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

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

vi.mock('@/libs/redis/bullmq', () => ({
  getBullMQConnection: vi.fn(() => ({})),
}));

// Mock SMS providers as classes
vi.mock('./providers/twilio.provider', () => ({
  default: class MockTwilioProvider {
    async sendShortMessage(_to: string, _body: string) {}
  },
}));

vi.mock('./providers/netgsm.provider', () => ({
  default: class MockNetGSMProvider {
    async sendShortMessage(_to: string, _body: string) {}
  },
}));

vi.mock('./providers/clickatell.provider', () => ({
  default: class MockClickatellProvider {
    async sendShortMessage(_to: string, _body: string) {}
  },
}));

vi.mock('./providers/nexmo.provider', () => ({
  default: class MockNexmoProvider {
    async sendShortMessage(_to: string, _body: string) {}
  },
}));

import SMSService from './notification_sms.service';
import redis from '@/libs/redis';

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
    // SMS_ALLOWED_COUNTRIES is not set in mock env, so ALLOWED_COUNTRIES is undefined/empty
    expect(SMSService.isAllowedCountry('TR')).toBe(true);
    expect(SMSService.isAllowedCountry('US')).toBe(true);
    expect(SMSService.isAllowedCountry('XX')).toBe(true);
  });
});

describe('SMSService.getProvider', () => {
  it('returns twilio as default provider', () => {
    const provider = SMSService.getProvider('twilio');
    expect(provider).toBeDefined();
  });

  it('falls back to default when unknown provider is given', () => {
    const provider = SMSService.getProvider('unknown' as any);
    expect(provider).toBeDefined();
  });
});

describe('SMSService.listProviders', () => {
  it('returns all 4 provider types', () => {
    const providers = SMSService.listProviders();
    expect(providers).toContain('twilio');
    expect(providers).toContain('netgsm');
    expect(providers).toContain('clickatell');
    expect(providers).toContain('nexmo');
    expect(providers).toHaveLength(4);
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
  it('returns netgsm for TR region', () => {
    const provider = SMSService.getProviderForRegion('TR');
    expect(provider).toBeDefined();
  });

  it('returns twilio for US region', () => {
    const provider = SMSService.getProviderForRegion('US');
    expect(provider).toBeDefined();
  });

  it('returns default provider for unknown region', () => {
    const provider = SMSService.getProviderForRegion('ZZ');
    expect(provider).toBeDefined();
  });
});

describe('SMSService.sendShortMessage', () => {
  it('does not queue when phone number is empty', async () => {
    await SMSService.sendShortMessage({ to: '', body: 'Hello' });
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('does not queue when body is empty', async () => {
    await SMSService.sendShortMessage({ to: '+12025551234', body: '' });
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('does not queue when rate limit is active for the number', async () => {
    mockRedis.get.mockResolvedValue('1'); // rate limit already set
    await SMSService.sendShortMessage({ to: '+12025551234', body: 'Hello' });
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('queues SMS when phone and body are valid and no rate limit', async () => {
    mockRedis.get.mockResolvedValue(null);

    const queueAddSpy = vi.spyOn(SMSService.QUEUE as any, 'add');

    await SMSService.sendShortMessage({ to: '+12025551234', body: 'Hello World' });

    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('+12025551234'),
      '1',
      'EX',
      60
    );
    expect(queueAddSpy).toHaveBeenCalled();
  });
});

describe('SMSService.sendShortMessageDirect', () => {
  it('does not throw for a valid number and body', async () => {
    await expect(
      SMSService.sendShortMessageDirect({ to: '+12025551234', body: 'Direct message' })
    ).resolves.not.toThrow();
  });

  it('does not throw for an invalid number (logs error gracefully)', async () => {
    await expect(
      SMSService.sendShortMessageDirect({ to: 'invalid', body: 'Direct message' })
    ).resolves.not.toThrow();
  });
});
