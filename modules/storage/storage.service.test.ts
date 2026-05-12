import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/modules/env', () => ({
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
  },
}));

vi.mock('@/modules/db', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/modules/redis', () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() },
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

vi.mock('./providers/aws-s3.provider', () => ({
  default: class MockAWSS3Provider {
    constructor(public config: any) {}
    async uploadFile() { return mockUploadResult; }
    async uploadFromUrl() { return mockUploadResult; }
    async deleteFile() {}
    getFileUrl(key: string) { return `https://test-bucket.s3.us-east-1.amazonaws.com/${key}`; }
  },
}));

vi.mock('./providers/cloudflare-r2.provider', () => ({
  default: class MockCloudflareR2Provider {
    constructor(public config: any) {}
    async uploadFile() { return mockUploadResult; }
    async uploadFromUrl() { return mockUploadResult; }
    async deleteFile() {}
    getFileUrl(key: string) { return `https://r2.example.com/${key}`; }
  },
}));

vi.mock('./providers/digitalocean-spaces.provider', () => ({
  default: class MockDOSpacesProvider {
    constructor(public config: any) {}
    async uploadFile() { return mockUploadResult; }
    async uploadFromUrl() { return mockUploadResult; }
    async deleteFile() {}
    getFileUrl(key: string) { return `https://spaces.example.com/${key}`; }
  },
}));

vi.mock('./providers/minio.provider', () => ({
  default: class MockMinIOProvider {
    constructor(public config: any) {}
    async uploadFile() { return mockUploadResult; }
    async uploadFromUrl() { return mockUploadResult; }
    async deleteFile() {}
    getFileUrl(key: string) { return `https://minio.example.com/${key}`; }
  },
}));

import StorageService from './storage.service';
import SettingService from '@/modules/setting/setting.service';

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

    const result = await StorageService.uploadFile({ file });

    expect(result.url).toBeTruthy();
    expect(result.key).toBeTruthy();
    expect(result.bucket).toBe('test-bucket');
    expect(result.provider).toBe('aws-s3');
  });

  it('propagates provider errors when settings fail to load', async () => {
    (SettingService.getByKeys as any).mockRejectedValueOnce(new Error('Settings unavailable'));
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    await expect(StorageService.uploadFile({ file })).rejects.toThrow();
  });
});

describe('StorageService.uploadFromUrl', () => {
  it('uploads from URL and returns UploadResult', async () => {
    const result = await StorageService.uploadFromUrl({
      url: 'https://example.com/image.jpg',
    });

    expect(result.url).toBeTruthy();
    expect(result.provider).toBe('aws-s3');
  });

  it('throws when settings are unavailable', async () => {
    (SettingService.getByKeys as any).mockRejectedValueOnce(new Error('Settings error'));
    await expect(
      StorageService.uploadFromUrl({ url: 'https://bad-url.example.com/image.jpg' })
    ).rejects.toThrow();
  });
});

describe('StorageService.deleteFile', () => {
  it('deletes a file without throwing', async () => {
    await expect(
      StorageService.deleteFile({ key: 'system/general/photo.jpg' })
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
      StorageService.deleteFile({ key: 'system/general/photo.jpg' })
    ).rejects.toThrow();
  });
});

describe('StorageService.getFileUrl', () => {
  it('returns a URL string for a given key', async () => {
    const url = await StorageService.getFileUrl({ key: 'system/general/photo.jpg' });
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
    const result = await StorageService.uploadFile({ file });
    expect(result.provider).toBe('cloudflare-r2');
  });
});
