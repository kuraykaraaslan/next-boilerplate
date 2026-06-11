import 'reflect-metadata';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AuditActions } from '@/modules/audit_log/audit_log.enums';
import { TENANT_BRANDING_KEYS } from './tenant_branding.setting.keys';
import { TenantBrandingSchema } from './tenant_branding.types';
import type { TenantBranding } from './tenant_branding.types';

export default class TenantBrandingService {

  static async get(tenantId: string): Promise<TenantBranding> {
    const raw = await SettingService.getByKeys(tenantId, [...TENANT_BRANDING_KEYS]);
    return TenantBrandingSchema.parse(raw);
  }

  static async update(tenantId: string, data: Partial<TenantBranding>, actorId?: string): Promise<TenantBranding> {
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

    if (actorId) {
      AuditLogService.log({
        actorType: 'USER',
        actorId,
        action: AuditActions.SETTINGS_UPDATED,
        resourceType: 'tenant_branding',
        resourceId: tenantId,
        metadata: { tenantId, changedKeys: Object.keys(updates) },
      });
    }

    return this.get(tenantId);
  }

  static async reset(tenantId: string, actorId?: string): Promise<void> {
    for (const key of TENANT_BRANDING_KEYS) {
      await SettingService.delete(tenantId, key).catch(() => {});
    }

    if (actorId) {
      AuditLogService.log({
        actorType: 'USER',
        actorId,
        action: AuditActions.SETTINGS_UPDATED,
        resourceType: 'tenant_branding',
        resourceId: tenantId,
        metadata: { tenantId, reset: true },
      });
    }
  }
}
