import { tenantDataSourceFor } from '@nb/db';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { parseSubnetString } from '@nb/network';
import SettingService from '@nb/setting/server/setting.service';
import { API_KEY_SETTING_KEYS } from './api_key.setting.keys';
import ApiKeyMessages from './api_key.messages';

export const DAY_MS = 24 * 60 * 60 * 1000;

// Keys unused for this long that then verify from a brand-new IP are flagged as
// a usage anomaly (possible credential leak after dormancy).
export const ANOMALY_DORMANCY_DAYS = 14;

export interface TenantPolicy {
  maxActiveKeys: number;
  maxTtlDays: number;
  requireExpiry: boolean;
  tenantIpAllowlist: string[];
  defaultRateLimitPerMinute: number;
  allowedScopes: string[];
}

// ============================================================================
// Per-tenant policy resolution (max keys, max TTL, require-expiry)
// ============================================================================

export async function getTenantPolicy(tenantId: string): Promise<TenantPolicy> {
  const keys = [
    API_KEY_SETTING_KEYS.MAX_ACTIVE_KEYS,
    API_KEY_SETTING_KEYS.MAX_TTL_DAYS,
    API_KEY_SETTING_KEYS.REQUIRE_EXPIRY,
    API_KEY_SETTING_KEYS.TENANT_IP_ALLOWLIST,
    API_KEY_SETTING_KEYS.DEFAULT_RATE_LIMIT_PER_MINUTE,
    API_KEY_SETTING_KEYS.ALLOWED_SCOPES,
  ];
  let values: Record<string, string> = {};
  try { values = await SettingService.getByKeys(tenantId, keys); } catch { values = {}; }

  const num = (k: string) => {
    const n = parseInt(values[k] ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return {
    maxActiveKeys: num(API_KEY_SETTING_KEYS.MAX_ACTIVE_KEYS),
    maxTtlDays: num(API_KEY_SETTING_KEYS.MAX_TTL_DAYS),
    requireExpiry: values[API_KEY_SETTING_KEYS.REQUIRE_EXPIRY] === 'true',
    tenantIpAllowlist: parseSubnetString(values[API_KEY_SETTING_KEYS.TENANT_IP_ALLOWLIST]),
    defaultRateLimitPerMinute: num(API_KEY_SETTING_KEYS.DEFAULT_RATE_LIMIT_PER_MINUTE),
    allowedScopes: (values[API_KEY_SETTING_KEYS.ALLOWED_SCOPES] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

/**
 * Validate and normalise the requested expiry against tenant lifecycle policy.
 * Throws when the tenant requires an expiry and none was given, or when the
 * requested expiry exceeds the tenant's maximum key lifetime.
 */
export function resolveExpiry(
  rawExpiresAt: string | undefined,
  policy: { maxTtlDays: number; requireExpiry: boolean },
): Date | null {
  let expiresAt = rawExpiresAt ? new Date(rawExpiresAt) : null;

  if (!expiresAt && policy.requireExpiry) {
    throw new AppError(ApiKeyMessages.EXPIRY_REQUIRED, 422, ErrorCode.VALIDATION_ERROR);
  }
  if (policy.maxTtlDays > 0) {
    const ceiling = new Date(Date.now() + policy.maxTtlDays * DAY_MS);
    if (!expiresAt) {
      // No cap can be "never" once a max TTL exists — clamp to the ceiling.
      expiresAt = ceiling;
    } else if (expiresAt.getTime() > ceiling.getTime()) {
      throw new AppError(ApiKeyMessages.TTL_EXCEEDS_MAX, 422, ErrorCode.VALIDATION_ERROR);
    }
  }
  return expiresAt;
}

export async function assertUnderKeyLimit(
  tenantId: string,
  repo: ReturnType<Awaited<ReturnType<typeof tenantDataSourceFor>>['getRepository']>,
  maxActiveKeys: number,
): Promise<void> {
  if (maxActiveKeys <= 0) return;
  const active = await (repo as any).count({ where: { tenantId, isActive: true } });
  if (active >= maxActiveKeys) {
    throw new AppError(ApiKeyMessages.MAX_KEYS_REACHED, 422, ErrorCode.VALIDATION_ERROR);
  }
}
