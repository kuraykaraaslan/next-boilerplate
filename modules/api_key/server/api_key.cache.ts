import redis from '@nb/redis';
import { env } from '@nb/env';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import SettingService from '@nb/setting/server/setting.service';
import { API_KEY_SETTING_KEYS } from './api_key.setting.keys';

export const API_KEY_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
export const NEG = '__not_found__';

export async function clearCache(apiKey: { apiKeyId: string; keyHash?: string; tenantId?: string }) {
  const ops: Promise<unknown>[] = [
    redis.del(`api_key:id:${apiKey.apiKeyId}`),
  ];
  if (apiKey.keyHash) ops.push(redis.del(`api_key:hash:${apiKey.keyHash}`));
  if (apiKey.tenantId) ops.push(redis.del(`api_key:tenant:${apiKey.tenantId}:${apiKey.apiKeyId}`));
  await Promise.all(ops.map((p) => p.catch(() => {})));
}

// In-memory cache for the platform-wide negative-cache TTL. Avoids a settings
// read on every verify; refreshed lazily once per minute.
let negTtlCache: { value: number; expiresAt: number } | null = null;

/**
 * Platform-wide negative-cache TTL, wired from the root tenant's
 * `apiKeyNegativeCacheTtlSeconds` setting (floored at 60s, never larger than
 * the positive cache TTL). Falls back to the previous hardcoded default when
 * the setting is unset or unreadable.
 */
export async function getNegativeCacheTtl(): Promise<number> {
  const fallback = Math.min(60, API_KEY_CACHE_TTL);
  const now = Date.now();
  if (negTtlCache && negTtlCache.expiresAt > now) return negTtlCache.value;
  let value = fallback;
  try {
    const raw = await SettingService.getValue(ROOT_TENANT_ID, API_KEY_SETTING_KEYS.NEGATIVE_CACHE_TTL_SECONDS);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed >= 60) value = Math.min(parsed, API_KEY_CACHE_TTL);
  } catch {
    /* keep fallback */
  }
  negTtlCache = { value, expiresAt: now + 60_000 };
  return value;
}
