import 'reflect-metadata';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AuditActions } from '@/modules/audit_log/audit_log.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';
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

// URL-bearing keys: must be absolute http(s) or root-relative — never
// javascript:/data:/vbscript: (stored-XSS via logo/link rendering).
const URL_KEYS = new Set<string>([
  'brandLogoLight', 'brandLogoDark', 'brandFavicon', 'authWallpaper',
  'privacyPolicyUrl', 'termsOfServiceUrl',
]);
const COLOR_KEYS = new Set<string>(['brandPrimaryColor', 'brandSecondaryColor']);

function assertSafeUrl(key: string, value: string): void {
  if (value === '') return; // clearing the value
  if (value.startsWith('/')) return; // root-relative is safe
  let url: URL;
  try { url = new URL(value); } catch { throw new AppError(`Invalid URL for ${key}`, 422, ErrorCode.VALIDATION_ERROR); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new AppError(`URL for ${key} must use http(s)`, 422, ErrorCode.VALIDATION_ERROR);
  }
}

function assertHexColor(key: string, value: string): void {
  if (value === '') return;
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())) {
    throw new AppError(`Color for ${key} must be a hex value like #1a2b3c`, 422, ErrorCode.VALIDATION_ERROR);
  }
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
      if (URL_KEYS.has(key)) assertSafeUrl(key, value);
      if (COLOR_KEYS.has(key)) assertHexColor(key, value);
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
