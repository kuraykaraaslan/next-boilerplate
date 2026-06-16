import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@nb/env', () => ({
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

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn(async () => ({})) })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock SettingService to control what storage settings are returned
vi.mock('@nb/setting/server/setting.service', () => ({
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
vi.mock('@nb/tenant_subscription/server/tenant_subscription.feature.service', () => ({
  default: {
    assertFeatureAccess: vi.fn(async () => undefined),
    checkFeatureAccess: vi.fn(async () => ({ allowed: true, featureKey: '', type: 'BOOLEAN', limit: null, unlimited: null, current: null })),
  },
}));
// Usage tracking is a side-effect of uploads — stub it so unit tests stay
// focused on storage behaviour (named export, not default).
vi.mock('@nb/tenant_usage/server/tenant_usage.service', () => ({
  TenantUsageService: {
    getUsage: vi.fn(async () => ({ storageBytes: 0 })),
    incrementStorageBytes: vi.fn(async () => undefined),
  },
}));
// Virus-scan deps are mocked so we control mode/result and avoid a real BullMQ
// (redis) connection at import time.
vi.mock('../storage.scan.job', () => ({
  enqueueVirusScan: vi.fn(async () => undefined),
  startVirusScanWorker: vi.fn(),
}));
vi.mock('../storage.scanner-factory', () => ({
  getScanConfig: vi.fn(),
  createScanner: vi.fn(),
}));
vi.mock('../storage.scan.service', () => ({
  scan: vi.fn(),
  handleInfected: vi.fn(),
}));

import StorageService from '../storage.service';
import SettingService from '@nb/setting/server/setting.service';
import { tenantDataSourceFor } from '@nb/db';
import { getScanConfig } from '../storage.scanner-factory';
import { scan } from '../storage.scan.service';
import { enqueueVirusScan } from '../storage.scan.job';

const TEST_TENANT_ID = '11111111-1111-4111-8111-111111111111';

const DISABLED_SCAN = {
  enabled: false, mode: 'async' as const, provider: 'virustotal' as const,
  apiKey: '', timeoutMs: 30000, infectedAction: 'quarantine' as const, quarantineFolder: 'quarantine',
};
const validJpeg = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], 'photo.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  vi.clearAllMocks();
  (SettingService.getByKeys as any).mockResolvedValue({
    storageProvider: 'aws-s3',
    s3Bucket: 'test-bucket',
    s3Region: 'us-east-1',
    s3AccessKey: 'test-access-key',
    s3SecretKey: 'test-secret-key',
  });
  (getScanConfig as any).mockResolvedValue(DISABLED_SCAN);
});

describe('StorageService.uploadFile', () => {
  it('uploads a file and returns UploadResult with provider', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], 'photo.jpg', { type: 'image/jpeg' });

    const result = await StorageService.uploadFile(TEST_TENANT_ID, { file });

    expect(result.url).toBeTruthy();
    expect(result.key).toBeTruthy();
    expect(result.bucket).toBe('test-bucket');
    expect(result.provider).toBe('aws-s3');
  });

  it('passes the tenantId to SettingService.getByKeys', async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], 'photo.jpg', { type: 'image/jpeg' });
    await StorageService.uploadFile(TEST_TENANT_ID, { file });
    expect((SettingService.getByKeys as any).mock.calls[0][0]).toBe(TEST_TENANT_ID);
  });

  it('propagates provider errors when settings fail to load', async () => {
    // Persistent rejection: getValidationPolicy/getScanConfig swallow their own
    // read failures, but getProvider's getStorageSettings does not — so the
    // upload still fails when settings are truly unavailable.
    (SettingService.getByKeys as any).mockRejectedValue(new Error('Settings unavailable'));
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], 'photo.jpg', { type: 'image/jpeg' });
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

describe('StorageService.uploadFile virus scanning', () => {
  it('sync mode: rejects an infected file', async () => {
    (getScanConfig as any).mockResolvedValue({ ...DISABLED_SCAN, enabled: true, mode: 'sync' });
    (scan as any).mockResolvedValue({ status: 'infected', provider: 'virustotal', threat: 'EICAR' });

    await expect(StorageService.uploadFile(TEST_TENANT_ID, { file: validJpeg() }))
      .rejects.toThrow(/virus scan/i);
    expect(enqueueVirusScan).not.toHaveBeenCalled();
  });

  it('sync mode: clean file uploads successfully', async () => {
    (getScanConfig as any).mockResolvedValue({ ...DISABLED_SCAN, enabled: true, mode: 'sync' });
    (scan as any).mockResolvedValue({ status: 'clean', provider: 'virustotal' });

    const result = await StorageService.uploadFile(TEST_TENANT_ID, { file: validJpeg() });
    expect(result.url).toBeTruthy();
    expect(enqueueVirusScan).not.toHaveBeenCalled();
  });

  it('async mode: uploads then enqueues a background scan', async () => {
    (getScanConfig as any).mockResolvedValue({ ...DISABLED_SCAN, enabled: true, mode: 'async' });
    // Audit persist must return an uploadedFileId for the enqueue to fire.
    (tenantDataSourceFor as any).mockResolvedValue({
      getRepository: () => ({
        create: (r: any) => r,
        save: async (r: any) => ({ ...r, uploadedFileId: 'uf-1' }),
      }),
    });

    const result = await StorageService.uploadFile(TEST_TENANT_ID, { file: validJpeg() });
    expect(result.url).toBeTruthy();
    expect(scan).not.toHaveBeenCalled(); // no inline scan in async mode
    expect(enqueueVirusScan).toHaveBeenCalledTimes(1);
  });

  it('disabled: neither scans nor enqueues', async () => {
    const result = await StorageService.uploadFile(TEST_TENANT_ID, { file: validJpeg() });
    expect(result.url).toBeTruthy();
    expect(scan).not.toHaveBeenCalled();
    expect(enqueueVirusScan).not.toHaveBeenCalled();
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

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], 'photo.jpg', { type: 'image/jpeg' });
    const result = await StorageService.uploadFile(TEST_TENANT_ID, { file });
    expect(result.provider).toBe('cloudflare-r2');
  });
});
