import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/libs/env', () => ({
  env: {
    SYSTEM_DATABASE_URL: 'postgresql://test',
    TENANT_DATABASE_URL: 'postgresql://test',
    ACCESS_TOKEN_SECRET: 'test_secret',
    REFRESH_TOKEN_SECRET: 'test_refresh',
    CSRF_SECRET: 'test_csrf',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/libs/typeorm', () => ({
  getSystemDataSource: vi.fn(),
  tenantDataSourceFor: vi.fn(),
  getDefaultTenantDataSource: vi.fn(),
  SystemDataSource: { isInitialized: false, initialize: vi.fn(), getRepository: vi.fn() },
}));

vi.mock('@/libs/redis', () => ({ default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() } }));
vi.mock('@/libs/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/modules/tenant_setting/tenant_setting.service', () => ({
  default: {
    getByKeys: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
}));

import TenantBrandingService from './tenant_branding.service';
import TenantSettingService from '@/modules/tenant_setting/tenant_setting.service';

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
    (TenantSettingService.getByKeys as any).mockResolvedValue(mockBranding);

    const result = await TenantBrandingService.get(TENANT_ID);
    expect(result.brandName).toBe('Acme');
    expect(result.brandPrimaryColor).toBe('#3b82f6');
    expect(TenantSettingService.getByKeys).toHaveBeenCalledWith(TENANT_ID, expect.any(Array));
  });

  it('returns partial branding when some keys are missing', async () => {
    (TenantSettingService.getByKeys as any).mockResolvedValue({ brandName: 'PartialBrand' });

    const result = await TenantBrandingService.get(TENANT_ID);
    expect(result.brandName).toBe('PartialBrand');
    expect(result.brandTagline).toBeUndefined();
  });

  it('returns empty object when no branding keys are set', async () => {
    (TenantSettingService.getByKeys as any).mockResolvedValue({});

    const result = await TenantBrandingService.get(TENANT_ID);
    expect(result).toEqual({});
  });
});

describe('TenantBrandingService.update', () => {
  it('updates only provided keys and returns updated branding', async () => {
    (TenantSettingService.updateMany as any).mockResolvedValue(undefined);
    (TenantSettingService.getByKeys as any).mockResolvedValue({ ...mockBranding, brandName: 'Updated' });

    const result = await TenantBrandingService.update(TENANT_ID, { brandName: 'Updated' });
    expect(result.brandName).toBe('Updated');
    expect(TenantSettingService.updateMany).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ brandName: 'Updated' })
    );
  });

  it('does not call updateMany when no keys are provided', async () => {
    (TenantSettingService.getByKeys as any).mockResolvedValue(mockBranding);

    await TenantBrandingService.update(TENANT_ID, {});
    expect(TenantSettingService.updateMany).not.toHaveBeenCalled();
  });

  it('updates multiple branding fields at once', async () => {
    (TenantSettingService.updateMany as any).mockResolvedValue(undefined);
    (TenantSettingService.getByKeys as any).mockResolvedValue({
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
    expect(TenantSettingService.updateMany).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ brandName: 'NewBrand', brandPrimaryColor: '#ff0000' })
    );
  });
});

describe('TenantBrandingService.reset', () => {
  it('deletes all branding keys ignoring errors', async () => {
    (TenantSettingService.delete as any).mockResolvedValue(undefined);

    await TenantBrandingService.reset(TENANT_ID);
    expect(TenantSettingService.delete).toHaveBeenCalledTimes(10);
    expect(TenantSettingService.delete).toHaveBeenCalledWith(TENANT_ID, 'brandName');
    expect(TenantSettingService.delete).toHaveBeenCalledWith(TENANT_ID, 'customCss');
  });

  it('does not throw even when individual deletes fail', async () => {
    (TenantSettingService.delete as any).mockRejectedValue(new Error('Delete failed'));

    await expect(TenantBrandingService.reset(TENANT_ID)).resolves.toBeUndefined();
  });
});
