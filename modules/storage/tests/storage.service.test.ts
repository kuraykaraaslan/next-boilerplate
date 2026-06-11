import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
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

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn(async () => ({})) })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock SettingService to control what storage settings are returned
vi.mock('@/modules/setting/setting.service', () => ({
  default: {
    getByKeys: vi.fn(async () => ({
      storageProvider: 'aws-s3',
      s3Bucket: 'test-bucket',
      s3Region: 'us-east-1',
      s3AccessKey: 'test-access-key',
      s3SecretKey: 'test-secret-key',
    })),
  },
}));

// Mock provider implementations as classes (required since service calls new Provider(config))
const mockUploadResult = {
  url: 'https://test-bucket.s3.us-east-1.amazonaws.com/system/general/file.jpg',
  key: 'system/general/file.jpg',
  bucket: 'test-bucket',
  size: 1024,
};

vi.mock('../providers/aws-s3.provider', () => ({
  default: class MockAWSS3Provider {
    constructor(public config: any) {}
    async uploadFile() { return mockUploadResult; }
    async uploadFromUrl() { return mockUploadResult; }
    async deleteFile() {}
    getFileUrl(key: string) { return `https://test-bucket.s3.us-east-1.amazonaws.com/${key}`; }
  },
}));

vi.mock('../providers/cloudflare-r2.provider', () => ({
  default: class MockCloudflareR2Provider {
    constructor(public config: any) {}
    async uploadFile() { return mockUploadResult; }
    async uploadFromUrl() { return mockUploadResult; }
    async deleteFile() {}
    getFileUrl(key: string) { return `https://r2.example.com/${key}`; }
  },
}));

vi.mock('../providers/digitalocean-spaces.provider', () => ({
  default: class MockDOSpacesProvider {
    constructor(public config: any) {}
    async uploadFile() { return mockUploadResult; }
    async uploadFromUrl() { return mockUploadResult; }
    async deleteFile() {}
    getFileUrl(key: string) { return `https://spaces.example.com/${key}`; }
  },
}));

vi.mock('../providers/minio.provider', () => ({
  default: class MockMinIOProvider {
    constructor(public config: any) {}
    async uploadFile() { return mockUploadResult; }
    async uploadFromUrl() { return mockUploadResult; }
    async deleteFile() {}
    getFileUrl(key: string) { return `https://minio.example.com/${key}`; }
  },
}));


// Bypass feature gating in unit tests — tested separately in tenant_subscription/.
// The gate lives in tenant_subscription.feature.service after the service split.
vi.mock('@/modules/tenant_subscription/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
// Usage tracking is a side-effect of uploads — stub it so unit tests stay
// focused on storage behaviour (named export, not default).
vi.mock('@/modules/tenant_usage/tenant_usage.service', () => ({
  TenantUsageService: {
    getUsage: vi.fn(async () => ({ storageBytes: 0 })),
    incrementStorageBytes: vi.fn(async () => undefined),
  },
}));
import StorageService from '../storage.service';
import SettingService from '@/modules/setting/setting.service';

const TEST_TENANT_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
  (SettingService.getByKeys as any).mockResolvedValue({
    storageProvider: 'aws-s3',
    s3Bucket: 'test-bucket',
    s3Region: 'us-east-1',
    s3AccessKey: 'test-access-key',
    s3SecretKey: 'test-secret-key',
  });
});

describe('StorageService.uploadFile', () => {
  it('uploads a file and returns UploadResult with provider', async () => {
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

    const result = await StorageService.uploadFile(TEST_TENANT_ID, { file });

    expect(result.url).toBeTruthy();
    expect(result.key).toBeTruthy();
    expect(result.bucket).toBe('test-bucket');
    expect(result.provider).toBe('aws-s3');
  });

  it('passes the tenantId to SettingService.getByKeys', async () => {
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    await StorageService.uploadFile(TEST_TENANT_ID, { file });
    expect((SettingService.getByKeys as any).mock.calls[0][0]).toBe(TEST_TENANT_ID);
  });

  it('propagates provider errors when settings fail to load', async () => {
    (SettingService.getByKeys as any).mockRejectedValueOnce(new Error('Settings unavailable'));
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    await expect(StorageService.uploadFile(TEST_TENANT_ID, { file })).rejects.toThrow();
  });
});

describe('StorageService.uploadFromUrl', () => {
  it('uploads from URL and returns UploadResult', async () => {
    const result = await StorageService.uploadFromUrl(TEST_TENANT_ID, {
      url: 'https://example.com/image.jpg',
    });

    expect(result.url).toBeTruthy();
    expect(result.provider).toBe('aws-s3');
  });

  it('throws when settings are unavailable', async () => {
    (SettingService.getByKeys as any).mockRejectedValueOnce(new Error('Settings error'));
    await expect(
      StorageService.uploadFromUrl(TEST_TENANT_ID, { url: 'https://bad-url.example.com/image.jpg' })
    ).rejects.toThrow();
  });
});

describe('StorageService.deleteFile', () => {
  it('deletes a file without throwing', async () => {
    await expect(
      StorageService.deleteFile(TEST_TENANT_ID, { key: 'system/general/photo.jpg' })
    ).resolves.not.toThrow();
  });

  it('throws when provider is unknown (invalid provider name from settings)', async () => {
    (SettingService.getByKeys as any).mockResolvedValueOnce({
      storageProvider: 'unknown-provider',
      s3Bucket: 'test-bucket',
      s3Region: 'us-east-1',
      s3AccessKey: 'key',
      s3SecretKey: 'secret',
    });

    await expect(
      StorageService.deleteFile(TEST_TENANT_ID, { key: 'system/general/photo.jpg' })
    ).rejects.toThrow();
  });
});

describe('StorageService.getFileUrl', () => {
  it('returns a URL string for a given key', async () => {
    const url = await StorageService.getFileUrl(TEST_TENANT_ID, { key: 'system/general/photo.jpg' });
    expect(typeof url).toBe('string');
    expect(url).toContain('photo.jpg');
  });
});

describe('StorageService with cloudflare-r2 provider', () => {
  it('uses cloudflare-r2 when settings specify it', async () => {
    (SettingService.getByKeys as any).mockResolvedValue({
      storageProvider: 'cloudflare-r2',
      s3Bucket: 'cf-bucket',
      s3Region: 'auto',
      s3AccessKey: 'cf-access',
      s3SecretKey: 'cf-secret',
      s3Endpoint: 'https://accountid.r2.cloudflarestorage.com',
    });

    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await StorageService.uploadFile(TEST_TENANT_ID, { file });
    expect(result.provider).toBe('cloudflare-r2');
  });
});
