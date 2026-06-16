import 'reflect-metadata';
import { getDataSource } from '@nb/db';
import redis, { jitter, singleFlight } from '@nb/redis';
import { ApiKey as ApiKeyEntity } from './entities/api_key.entity';
import { SafeApiKey, SafeApiKeySchema } from './api_key.types';
import ApiKeyMessages from './api_key.messages';
import { scopeSatisfies } from './api_key.enums';
import { ipMatchesAllowlist } from '@nb/network';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { hashKey } from './api_key.crypto';
import { API_KEY_CACHE_TTL, NEG, getNegativeCacheTtl } from './api_key.cache';
import { getTenantPolicy } from './api_key.policy';
import {
  auditFailure,
  detectAnomaly,
  ipFromHeaders,
  recordUsage,
  withinRateLimit,
} from './api_key.verify.helpers';

/** Optional request context for {@link verify}. */
export interface VerifyContext {
  /** Source IP of the caller (for allowlist + anomaly detection). */
  ip?: string | null;
}

/**
 * Verify a raw API key from an incoming request.
 * Updates lastUsedAt / lastUsedIp / usageCount on success.
 * Throws with a descriptive message on any failure.
 *
 * Negative cache: an unknown hash is cached as `__not_found__` for a short window to blunt
 * credential-stuffing — repeated guesses hit Redis, not the DB.
 *
 * When `ctx.ip` is supplied it is enforced against the key's IP allowlist (and
 * the tenant-wide default allowlist), feeds anomaly detection, and is recorded
 * as `lastUsedIp`.
 */
export async function verify(rawKey: string, requiredScope?: string, ctx?: VerifyContext): Promise<SafeApiKey> {
  const ip = ctx?.ip ?? null;
  const hash = hashKey(rawKey);
  const cacheKey = `api_key:hash:${hash}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached === NEG) {
    auditFailure('unknown_key', null, ip);
    throw new AppError(ApiKeyMessages.INVALID_KEY, 401, ErrorCode.UNAUTHORIZED);
  }

  let row: ApiKeyEntity | null = null;
  if (cached) {
    try { row = JSON.parse(cached) as ApiKeyEntity; } catch { await redis.del(cacheKey).catch(() => {}); }
  }

  if (!row) {
    row = await singleFlight(cacheKey, async () => {
      const ds = await getDataSource();
      const repo = ds.getRepository(ApiKeyEntity);
      const found = await repo.findOne({ where: { keyHash: hash } });
      if (!found) {
        await redis.setex(cacheKey, jitter(await getNegativeCacheTtl()), NEG).catch(() => {});
        return null;
      }
      await redis.setex(cacheKey, jitter(API_KEY_CACHE_TTL), JSON.stringify(found)).catch(() => {});
      return found;
    });
    if (!row) {
      auditFailure('unknown_key', null, ip);
      throw new AppError(ApiKeyMessages.INVALID_KEY, 401, ErrorCode.UNAUTHORIZED);
    }
  }

  if (!row.isActive) {
    auditFailure('inactive', row.tenantId, ip, row.apiKeyId);
    throw new AppError(ApiKeyMessages.KEY_INACTIVE, 401, ErrorCode.UNAUTHORIZED);
  }

  if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
    auditFailure('expired', row.tenantId, ip, row.apiKeyId);
    throw new AppError(ApiKeyMessages.KEY_EXPIRED, 401, ErrorCode.UNAUTHORIZED);
  }

  if (requiredScope && !scopeSatisfies(row.scopes, requiredScope)) {
    auditFailure('insufficient_scope', row.tenantId, ip, row.apiKeyId);
    throw new AppError(ApiKeyMessages.INSUFFICIENT_SCOPE, 403, ErrorCode.FORBIDDEN);
  }

  // Per-key IP allowlist (cheap — lives on the row). Falls back to the
  // tenant-wide default allowlist only when the key declares none.
  let policy: Awaited<ReturnType<typeof getTenantPolicy>> | null = null;
  const perKeyAllowlist = row.ipAllowlist ?? [];
  if (perKeyAllowlist.length > 0) {
    if (!ipMatchesAllowlist(ip, perKeyAllowlist)) {
      auditFailure('ip_denied', row.tenantId, ip, row.apiKeyId);
      throw new AppError(ApiKeyMessages.IP_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
    }
  } else {
    policy = await getTenantPolicy(row.tenantId);
    if (!ipMatchesAllowlist(ip, policy.tenantIpAllowlist)) {
      auditFailure('ip_denied', row.tenantId, ip, row.apiKeyId);
      throw new AppError(ApiKeyMessages.IP_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
    }
  }

  // Per-key rate limit (tenant default policy).
  if (!policy) policy = await getTenantPolicy(row.tenantId);
  if (!(await withinRateLimit(row.apiKeyId, policy.defaultRateLimitPerMinute))) {
    auditFailure('rate_limited', row.tenantId, ip, row.apiKeyId);
    throw new AppError(ApiKeyMessages.RATE_LIMITED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
  }

  // Anomaly detection: a dormant key suddenly used from a new IP.
  detectAnomaly(row, ip);

  // Record usage (fire-and-forget — never block the request on bookkeeping).
  void recordUsage(row.apiKeyId, ip);

  return SafeApiKeySchema.parse(row);
}

/**
 * Verify a raw API key from a request `Authorization: Bearer <key>` header,
 * optionally pinning the key to a tenant and enforcing a required scope.
 *
 * Used by SCIM 2.0 endpoints and other machine-to-machine integrations
 * where the caller cannot present a session cookie.
 *
 * Throws on missing/invalid header, mismatched tenant, or insufficient scope.
 */
export async function verifyFromAuthHeader(
  request: { headers: { get: (name: string) => string | null } },
  tenantId?: string,
  requiredScope?: string,
  ctx?: VerifyContext,
): Promise<SafeApiKey> {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) throw new AppError(ApiKeyMessages.INVALID_KEY, 401, ErrorCode.UNAUTHORIZED);

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) throw new AppError(ApiKeyMessages.INVALID_KEY, 401, ErrorCode.UNAUTHORIZED);

  const rawKey = match[1].trim();
  if (!rawKey) throw new AppError(ApiKeyMessages.INVALID_KEY, 401, ErrorCode.UNAUTHORIZED);

  // Derive the source IP from the request when the caller did not supply one,
  // so SCIM / M2M callers get IP-allowlist + anomaly enforcement for free.
  const resolvedCtx: VerifyContext = {
    ip: ctx?.ip ?? ipFromHeaders(request.headers),
  };

  const key = await verify(rawKey, requiredScope, resolvedCtx);

  if (tenantId && key.tenantId !== tenantId) {
    throw new AppError(ApiKeyMessages.INVALID_KEY, 401, ErrorCode.UNAUTHORIZED);
  }
  return key;
}
