import 'reflect-metadata';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AuditActions } from '@/modules/audit_log/audit_log.enums';
import { TENANT_BRANDING_KEYS } from './tenant_branding.setting.keys';
import { TenantBrandingSchema } from './tenant_branding.types';
import type { TenantBranding } from './tenant_branding.types';

// Patterns unsafe in injected CSS: IE expression(), JS URLs, data-URI backgrounds, @import exfiltration.
const UNSAFE_CSS_PATTERNS = [
  /expression\s*\(/gi,
  /url\s*\(\s*['"]?\s*javascript:/gi,
  /url\s*\(\s*['"]?\s*data:/gi,
  /@import\b/gi,
  /<\/?\s*script/gi,
];

function sanitizeCss(raw: string): string {
  return UNSAFE_CSS_PATTERNS.reduce((s, p) => s.replace(p, '/* blocked */'), raw);
}

export default class TenantBrandingService {

  static async get(tenantId: string): Promise<TenantBranding> {
    const raw = await SettingService.getByKeys(tenantId, [...TENANT_BRANDING_KEYS]);
    return TenantBrandingSchema.parse(raw);
  }

  static async update(tenantId: string, data: Partial<TenantBranding>, actorId?: string): Promise<TenantBranding> {
    const updates: Record<string, string> = {};

    for (const key of TENANT_BRANDING_KEYS) {
      let value = data[key];
      if (value === undefined) continue;
      if (key === 'customCss') value = sanitizeCss(value);
      if (key === 'customJs') value = value.replace(/<\/?\s*script[^>]*>/gi, '/* blocked */');
      updates[key] = value;
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
