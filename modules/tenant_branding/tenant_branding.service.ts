import 'reflect-metadata';
import SettingService from '@/modules/setting/setting.service';
import { TENANT_BRANDING_KEYS } from './tenant_branding.setting.keys';
import { TenantBrandingSchema } from './tenant_branding.types';
import type { TenantBranding } from './tenant_branding.types';

export default class TenantBrandingService {

  static async get(tenantId: string): Promise<TenantBranding> {
    const raw = await SettingService.getByKeys(tenantId, [...TENANT_BRANDING_KEYS]);
    return TenantBrandingSchema.parse(raw);
  }

  static async update(tenantId: string, data: Partial<TenantBranding>): Promise<TenantBranding> {
    const updates: Record<string, string> = {};

    for (const key of TENANT_BRANDING_KEYS) {
      const value = data[key];
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      await SettingService.updateMany(tenantId, updates);
    }

    return this.get(tenantId);
  }

  static async reset(tenantId: string): Promise<void> {
    for (const key of TENANT_BRANDING_KEYS) {
      await SettingService.delete(tenantId, key).catch(() => {});
    }
  }
}
