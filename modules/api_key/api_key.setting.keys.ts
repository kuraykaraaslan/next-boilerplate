import { z } from 'zod';

// Canonical per-tenant setting keys for the api_key module. Centralised so the
// service (runtime enforcement) and the settings-fields file (admin UI) never
// drift apart.
//
// NEGATIVE_CACHE_TTL_SECONDS is read from the ROOT tenant — the negative cache
// keys on a key *hash* before the owning tenant is known, so it is a
// platform-wide knob rather than a per-tenant one.
export const ApiKeySettingKeySchema = z.enum([
  'apiKeyNegativeCacheTtlSeconds',
  'apiKeyMaxActiveKeys',
  'apiKeyMaxTtlDays',
  'apiKeyRequireExpiry',
  'apiKeyTenantIpAllowlist',
  'apiKeyDefaultRateLimitPerMinute',
]);
export type ApiKeySettingKey = z.infer<typeof ApiKeySettingKeySchema>;
export const API_KEY_SETTING_KEY_LIST = ApiKeySettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const API_KEY_SETTING_KEYS = {
  NEGATIVE_CACHE_TTL_SECONDS: 'apiKeyNegativeCacheTtlSeconds',
  MAX_ACTIVE_KEYS: 'apiKeyMaxActiveKeys',
  MAX_TTL_DAYS: 'apiKeyMaxTtlDays',
  REQUIRE_EXPIRY: 'apiKeyRequireExpiry',
  TENANT_IP_ALLOWLIST: 'apiKeyTenantIpAllowlist',
  DEFAULT_RATE_LIMIT_PER_MINUTE: 'apiKeyDefaultRateLimitPerMinute',
} as const satisfies Record<string, ApiKeySettingKey>;
