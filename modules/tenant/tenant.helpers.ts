import 'reflect-metadata';
import redis from '@/modules/redis';
import { env } from '@/modules/env';
import Logger from '@/modules/logger';
import { isRootTenant } from './tenant.constants';

export const TENANT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

// ── Default locale per region ─────────────────────────────────────────────────
export const REGION_LOCALE_DEFAULTS: Record<string, { language: string; timezone: string; dateFormat: string; timeFormat: string }> = {
  TR:    { language: 'tr',    timezone: 'Europe/Istanbul',       dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm' },
  EU:    { language: 'en',    timezone: 'Europe/Berlin',         dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm' },
  US:    { language: 'en',    timezone: 'America/New_York',      dateFormat: 'MM/DD/YYYY', timeFormat: 'hh:mm A' },
  APAC:  { language: 'en',    timezone: 'Asia/Singapore',        dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
  LATAM: { language: 'es',    timezone: 'America/Sao_Paulo',     dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
  MEA:   { language: 'en',    timezone: 'Asia/Dubai',            dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
};

export type SeedDefaults = {
  skipPlan?: boolean;
  skipSubscription?: boolean;
  skipSettings?: boolean;
};

export async function clearCache(tenantId: string): Promise<void> {
  await redis.del(`tenant:id:${tenantId}`).catch(() => {});
}

export async function seedDefaults(
  tenantId: string,
  defaults?: SeedDefaults,
  region?: string,
): Promise<{ ok: boolean; errors: string[] }> {
  if (isRootTenant(tenantId)) return { ok: true, errors: [] };

  const errors: string[] = [];

  if (!defaults?.skipPlan && !defaults?.skipSubscription) {
    try {
      const { default: TenantPlatformPlanService } = await import('@/modules/tenant_subscription/tenant_subscription.platform.service');
      const { default: TenantFeatureGateService } = await import('@/modules/tenant_subscription/tenant_subscription.feature.service');
      const defaultPlanId = await TenantFeatureGateService.getDefaultPlanId();
      if (defaultPlanId) {
        await TenantPlatformPlanService.assignPlatformPlan(tenantId, { planId: defaultPlanId, priceOverride: 0 });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(`[TenantService.seedDefaults] default plan assignment failed for ${tenantId}: ${msg}`);
      errors.push(`plan: ${msg}`);
    }
  }

  if (!defaults?.skipSettings) {
    try {
      const SettingService = (await import('@/modules/setting/setting.service')).default;
      // Use region-aware locale defaults
      const localeDefaults = (region ? REGION_LOCALE_DEFAULTS[region] : null) ?? REGION_LOCALE_DEFAULTS['TR'];
      await SettingService.updateMany(tenantId, {
        language: localeDefaults.language,
        dateFormat: localeDefaults.dateFormat,
        timeFormat: localeDefaults.timeFormat,
        timezone: localeDefaults.timezone,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.warn(`[TenantService.seedDefaults] default settings seed failed for ${tenantId}: ${msg}`);
      errors.push(`settings: ${msg}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
