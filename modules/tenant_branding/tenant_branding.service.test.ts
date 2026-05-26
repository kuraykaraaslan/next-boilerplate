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
vi.mock('@/modules/setting/setting.service', () => ({
  default: {
    getByKeys: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
}));

import TenantBrandingService from './tenant_branding.service';
import SettingService from '@/modules/setting/setting.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';

const mockBranding = {
  brandName: 'Acme',
  brandTagline: 'Building the future',
  brandLogoLight: 'https://example.com/logo-light.png',
  brandLogoDark: 'https://example.com/logo-dark.png',
  brandFavicon: 'https://example.com/favicon.ico',
  brandPrimaryColor: '#3b82f6',
  brandSecondaryColor: '#10b981',
  authWallpaper: 'https://example.com/wallpaper.jpg',
  customCss: '',
  customJs: '',
};

beforeEach(() => vi.clearAllMocks());

describe('TenantBrandingService.get', () => {
  it('returns parsed branding from tenant settings', async () => {
    (SettingService.getByKeys as any).mockResolvedValue(mockBranding);

    const result = await TenantBrandingService.get(TENANT_ID);
    expect(result.brandName).toBe('Acme');
    expect(result.brandPrimaryColor).toBe('#3b82f6');
    expect(SettingService.getByKeys).toHaveBeenCalledWith(TENANT_ID, expect.any(Array));
  });

  it('returns partial branding when some keys are missing', async () => {
    (SettingService.getByKeys as any).mockResolvedValue({ brandName: 'PartialBrand' });

    const result = await TenantBrandingService.get(TENANT_ID);
    expect(result.brandName).toBe('PartialBrand');
    expect(result.brandTagline).toBeUndefined();
  });

  it('returns empty object when no branding keys are set', async () => {
    (SettingService.getByKeys as any).mockResolvedValue({});

    const result = await TenantBrandingService.get(TENANT_ID);
    expect(result).toEqual({});
  });
});

describe('TenantBrandingService.update', () => {
  it('updates only provided keys and returns updated branding', async () => {
    (SettingService.updateMany as any).mockResolvedValue(undefined);
    (SettingService.getByKeys as any).mockResolvedValue({ ...mockBranding, brandName: 'Updated' });

    const result = await TenantBrandingService.update(TENANT_ID, { brandName: 'Updated' });
    expect(result.brandName).toBe('Updated');
    expect(SettingService.updateMany).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ brandName: 'Updated' })
    );
  });

  it('does not call updateMany when no keys are provided', async () => {
    (SettingService.getByKeys as any).mockResolvedValue(mockBranding);

    await TenantBrandingService.update(TENANT_ID, {});
    expect(SettingService.updateMany).not.toHaveBeenCalled();
  });

  it('updates multiple branding fields at once', async () => {
    (SettingService.updateMany as any).mockResolvedValue(undefined);
    (SettingService.getByKeys as any).mockResolvedValue({
      ...mockBranding,
      brandName: 'NewBrand',
      brandPrimaryColor: '#ff0000',
    });

    const result = await TenantBrandingService.update(TENANT_ID, {
      brandName: 'NewBrand',
      brandPrimaryColor: '#ff0000',
    });
    expect(result.brandName).toBe('NewBrand');
    expect(result.brandPrimaryColor).toBe('#ff0000');
    expect(SettingService.updateMany).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ brandName: 'NewBrand', brandPrimaryColor: '#ff0000' })
    );
  });
});

describe('TenantBrandingService.reset', () => {
  it('deletes all branding keys ignoring errors', async () => {
    (SettingService.delete as any).mockResolvedValue(undefined);

    await TenantBrandingService.reset(TENANT_ID);
    expect(SettingService.delete).toHaveBeenCalledTimes(10);
    expect(SettingService.delete).toHaveBeenCalledWith(TENANT_ID, 'brandName');
    expect(SettingService.delete).toHaveBeenCalledWith(TENANT_ID, 'customCss');
  });

  it('does not throw even when individual deletes fail', async () => {
    (SettingService.delete as any).mockRejectedValue(new Error('Delete failed'));

    await expect(TenantBrandingService.reset(TENANT_ID)).resolves.toBeUndefined();
  });
});
