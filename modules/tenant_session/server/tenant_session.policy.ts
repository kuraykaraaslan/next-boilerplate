import 'reflect-metadata';
import { env } from '@kuraykaraaslan/env';
import redis from '@kuraykaraaslan/redis';
import { ipMatchesAllowlist, parseSubnetString } from '@kuraykaraaslan/network';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import TenantAuthMessages from './tenant_session.messages';
import type { TenantSessionRequestContext } from './tenant_session.types';

export const TENANT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

// Per-tenant auth-failure circuit breaker: when a tenant accumulates this many
// failed membership resolutions within the window, further resolution is
// short-circuited so a credential-stuffing burst can't hammer the per-tenant DB.
const AUTH_FAIL_WINDOW = 60;          // seconds
const AUTH_FAIL_THRESHOLD = 50;       // failures per window before tripping

/**
 * Resolve the cache TTL for a tenant's session, honouring the per-tenant
 * `sessionTimeout` security setting (interpreted as minutes). The cache must
 * never outlive the tenant's declared session window, so we cap it at the
 * smaller of the global TTL and the tenant policy.
 */
export async function resolveSessionTtl(tenantId: string): Promise<number> {
  try {
    const s = await SettingService.getByKeys(tenantId, ['sessionTimeout']);
    const minutes = Number(s.sessionTimeout);
    if (Number.isFinite(minutes) && minutes > 0) {
      return Math.max(30, Math.min(TENANT_CACHE_TTL, Math.floor(minutes * 60)));
    }
  } catch { /* fall through to global default */ }
  return TENANT_CACHE_TTL;
}

/**
 * Enforce the tenant's `ipBlacklist` (deny if matched) then `ipWhitelist`
 * (deny if set and not matched) against the request IP. No-op when neither
 * list is configured.
 */
export async function assertIpAllowed(tenantId: string, ip: string | null | undefined): Promise<void> {
  let blacklist: string[] = [];
  let whitelist: string[] = [];
  try {
    const s = await SettingService.getByKeys(tenantId, ['ipBlacklist', 'ipWhitelist']);
    blacklist = parseSubnetString(s.ipBlacklist);
    whitelist = parseSubnetString(s.ipWhitelist);
  } catch { return; } // fail-open on settings read; ACL is best-effort gating

  if (blacklist.length > 0 && ip && ipMatchesAllowlist(ip, blacklist)) {
    throw new AppError(TenantAuthMessages.IP_BLOCKED, 403, ErrorCode.FORBIDDEN);
  }
  if (whitelist.length > 0 && !ipMatchesAllowlist(ip, whitelist)) {
    throw new AppError(TenantAuthMessages.IP_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
  }
}

/**
 * Enforce the tenant's `twoFactorRequired` policy at the session layer: when
 * the tenant mandates 2FA the request must carry a verified second factor.
 */
export async function assert2faSatisfied(tenantId: string, ctx: TenantSessionRequestContext): Promise<void> {
  let required = false;
  try {
    const s = await SettingService.getByKeys(tenantId, ['twoFactorRequired']);
    required = s.twoFactorRequired === 'true';
  } catch { return; }
  if (required && ctx.mfaVerified !== true) {
    throw new AppError(TenantAuthMessages.TWO_FACTOR_REQUIRED, 403, ErrorCode.FORBIDDEN);
  }
}

/**
 * Concurrent-session limiting per member. Tracks active session ids in a
 * Redis sorted-set keyed by member, expiring stale entries by the resolved
 * session TTL. Returns silently when no `maxConcurrentSessions` policy is set
 * or no `sessionId` is supplied (cannot account without an identity).
 */
export async function assertConcurrentLimit(
  tenantId: string,
  userId: string,
  ctx: TenantSessionRequestContext,
  ttl: number,
): Promise<void> {
  if (!ctx.sessionId) return;
  let max = 0;
  try {
    const s = await SettingService.getByKeys(tenantId, ['maxConcurrentSessions']);
    max = Number(s.maxConcurrentSessions) || 0;
  } catch { return; }
  if (max <= 0) return;

  const key = `tenant:sessions:${tenantId}:${userId}`;
  const now = Date.now();
  const cutoff = now - ttl * 1000;
  try {
    await redis.zremrangebyscore(key, 0, cutoff);
    // Refresh/insert this session, then enforce the cap.
    await redis.zadd(key, now, ctx.sessionId);
    await redis.expire(key, ttl);
    const active = await redis.zrange(key, 0, -1);
    if (active.length > max) {
      // This session is the newest; reject it and drop it back out.
      if (!active.slice(0, max).includes(ctx.sessionId)) {
        await redis.zrem(key, ctx.sessionId).catch(() => {});
        throw new AppError(TenantAuthMessages.CONCURRENT_SESSION_LIMIT, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
      }
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    // fail-open on Redis errors — availability over strict enforcement
  }
}

/**
 * Impossible-travel / geo anomaly detection. Compares the request country to
 * the last-seen country for this member; a mismatch within a short window is
 * recorded as a high-severity audit signal (non-blocking by design — alerting,
 * not lockout, is the documented control).
 */
export async function checkGeoAnomaly(
  tenantId: string,
  userId: string,
  ctx: TenantSessionRequestContext,
): Promise<boolean> {
  if (!ctx.country) return false;
  const key = `tenant:geo:${tenantId}:${userId}`;
  try {
    const prev = await redis.get(key);
    await redis.setex(key, 3600, ctx.country);
    if (prev && prev !== ctx.country) {
      await AuditLogService.log({
        tenantId, actorId: userId, actorType: 'USER', action: 'tenant.session.geo_anomaly',
        severity: 'high', resourceType: 'tenant', resourceId: tenantId,
        ipAddress: ctx.ip ?? null, userAgent: ctx.userAgent ?? null,
        metadata: { previousCountry: prev, currentCountry: ctx.country },
      });
      return true;
    }
  } catch { /* fail-open */ }
  return false;
}

/** Trip-check the per-tenant auth-failure circuit breaker. */
export async function assertCircuitClosed(tenantId: string): Promise<void> {
  try {
    const n = Number(await redis.get(`tenant:authfail:${tenantId}`)) || 0;
    if (n >= AUTH_FAIL_THRESHOLD) {
      throw new AppError(TenantAuthMessages.TOO_MANY_AUTH_FAILURES, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    }
  } catch (e) {
    if (e instanceof AppError) throw e; // honour a tripped breaker
  }
}

/** Increment the per-tenant auth-failure counter (windowed). */
export async function recordAuthFailure(tenantId: string): Promise<void> {
  const key = `tenant:authfail:${tenantId}`;
  try {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, AUTH_FAIL_WINDOW);
  } catch { /* fail-open */ }
}
