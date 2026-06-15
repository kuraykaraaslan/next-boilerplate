import 'reflect-metadata';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AuditActions } from '@/modules/audit_log/audit_log.enums';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { TENANT_BRANDING_KEYS } from './tenant_branding.setting.keys';
import { TenantBrandingSchema } from './tenant_branding.types';
import type { TenantBranding } from './tenant_branding.types';

// Branding is read on virtually every page render (logo, colours, custom CSS)
// but changes only when an admin updates it — an ideal read-through cache target.
// The underlying SettingService keys are cached individually; this consolidates
// the whole branding object into one key so a render does a single GET + no Zod
// re-parse. Invalidated explicitly on update()/reset().
const BRANDING_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

function cacheKey(tenantId: string): string {
  return `tenant_branding:${tenantId}`;
}

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
    const key = cacheKey(tenantId);
    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      try { return TenantBrandingSchema.parse(JSON.parse(cached)); } catch { await redis.del(key).catch(() => {}); }
    }

    return singleFlight(key, async () => {
      const raw = await SettingService.getByKeys(tenantId, [...TENANT_BRANDING_KEYS]);
      const parsed = TenantBrandingSchema.parse(raw);
      await redis.setex(key, jitter(BRANDING_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  /** Drop the consolidated branding cache (called after any settings write). */
  private static async invalidate(tenantId: string): Promise<void> {
    await redis.del(cacheKey(tenantId)).catch(() => {});
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
      await this.invalidate(tenantId);
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
    await this.invalidate(tenantId);

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
