import 'reflect-metadata';
import { env } from '@/modules/env';
import { IsNull, In } from 'typeorm';
import { tenantDataSourceFor, getDataSource } from '@/modules/db';
import { Tenant as TenantEntity } from '@/modules/tenant/entities/tenant.entity';
import { TenantMember as TenantMemberEntity } from '@/modules/tenant_member/entities/tenant_member.entity';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { ipMatchesAllowlist, parseSubnetString } from '@/modules/network';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SafeTenant, SafeTenantSchema } from '@/modules/tenant/tenant.types';
import { SafeTenantMember, SafeTenantMemberSchema } from '@/modules/tenant_member/tenant_member.types';
import { SafeUser } from '@/modules/user/user.types';
import TenantAuthMessages from './tenant_session.messages';
import type { TenantMemberRole } from '@/modules/tenant_member/tenant_member.enums';

const TENANT_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);

// Per-tenant auth-failure circuit breaker: when a tenant accumulates this many
// failed membership resolutions within the window, further resolution is
// short-circuited so a credential-stuffing burst can't hammer the per-tenant DB.
const AUTH_FAIL_WINDOW = 60;          // seconds
const AUTH_FAIL_THRESHOLD = 50;       // failures per window before tripping

/** Typed tenant-session context propagated to route handlers. */
export interface TenantSessionContext {
  tenant: SafeTenant;
  tenantMember: SafeTenantMember;
  user: SafeUser;
  role: TenantMemberRole;
}

/** Optional per-request signals for session-resolution security checks. */
export interface TenantSessionRequestContext {
  ip?: string | null;
  userAgent?: string | null;
  /** Whether the user has satisfied MFA this session (drives 2FA enforcement). */
  mfaVerified?: boolean;
  /** ISO country of the request IP, when known (geo anomaly detection). */
  country?: string | null;
  /** Stable per-device/session id used for concurrent-session accounting. */
  sessionId?: string | null;
}

export default class TenantSessionService {

  private static readonly ROLE_HIERARCHY: TenantMemberRole[] = ['OWNER', 'ADMIN', 'USER'];

  static hasRequiredRole(memberRole: TenantMemberRole, requiredRole: TenantMemberRole): boolean {
    return TenantSessionService.ROLE_HIERARCHY.indexOf(memberRole) <= TenantSessionService.ROLE_HIERARCHY.indexOf(requiredRole);
  }

  static async getTenantById(tenantId: string): Promise<SafeTenant | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const tenant = await ds.getRepository(TenantEntity).findOne({ where: { tenantId } });
    return tenant ? SafeTenantSchema.parse(tenant) : null;
  }

  static async getTenantMembership(tenantId: string, userId: string): Promise<SafeTenantMember | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const member = await ds.getRepository(TenantMemberEntity).findOne({ where: { tenantId, userId, deletedAt: IsNull() } });
    return member ? SafeTenantMemberSchema.parse(member) : null;
  }

  static validateTenantStatus(tenant: SafeTenant): void {
    if (tenant.tenantStatus === 'INACTIVE') throw new AppError(TenantAuthMessages.TENANT_INACTIVE, 403, ErrorCode.FORBIDDEN);
    if (tenant.tenantStatus === 'SUSPENDED') throw new AppError(TenantAuthMessages.TENANT_SUSPENDED, 403, ErrorCode.TENANT_SUSPENDED);
  }

  static validateMemberStatus(tenantMember: SafeTenantMember): void {
    if (tenantMember.memberStatus === 'INACTIVE') throw new AppError(TenantAuthMessages.MEMBER_INACTIVE, 403, ErrorCode.FORBIDDEN);
    if (tenantMember.memberStatus === 'SUSPENDED') throw new AppError(TenantAuthMessages.MEMBER_SUSPENDED, 403, ErrorCode.FORBIDDEN);
    if (tenantMember.memberStatus === 'PENDING') throw new AppError(TenantAuthMessages.MEMBER_PENDING, 403, ErrorCode.FORBIDDEN);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Per-tenant security policy helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Resolve the cache TTL for a tenant's session, honouring the per-tenant
   * `sessionTimeout` security setting (interpreted as minutes). The cache must
   * never outlive the tenant's declared session window, so we cap it at the
   * smaller of the global TTL and the tenant policy.
   */
  static async resolveSessionTtl(tenantId: string): Promise<number> {
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
  static async assertIpAllowed(tenantId: string, ip: string | null | undefined): Promise<void> {
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
  static async assert2faSatisfied(tenantId: string, ctx: TenantSessionRequestContext): Promise<void> {
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
  static async assertConcurrentLimit(
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
  static async checkGeoAnomaly(
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
  private static async assertCircuitClosed(tenantId: string): Promise<void> {
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
  private static async recordAuthFailure(tenantId: string): Promise<void> {
    const key = `tenant:authfail:${tenantId}`;
    try {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, AUTH_FAIL_WINDOW);
    } catch { /* fail-open */ }
  }

  // ──────────────────────────────────────────────────────────────────────────

  static async authenticateTenantMembership({ user, tenantId, requiredRole = 'USER', context }: {
    user: SafeUser;
    tenantId: string;
    requiredRole?: TenantMemberRole;
    context?: TenantSessionRequestContext;
  }): Promise<{ tenant: SafeTenant; tenantMember: SafeTenantMember }> {
    // Per-tenant security gates that don't need the membership row run first so
    // a blocked IP / unsatisfied 2FA never touches the DB.
    if (context) {
      await this.assertCircuitClosed(tenantId);
      await this.assertIpAllowed(tenantId, context.ip);
      await this.assert2faSatisfied(tenantId, context);
    }

    const cacheKey = `tenant:member:${user.userId}:${tenantId}`;
    const cached = await redis.get(cacheKey).catch(() => null);

    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (cachedData?.tenant && cachedData?.tenantMember) {
          const ds = await tenantDataSourceFor(tenantId);
          const dbMember = await ds.getRepository(TenantMemberEntity)
            .findOne({ where: { tenantId, userId: user.userId, deletedAt: IsNull() }, select: { sessionVersion: true } });
          if (!dbMember || dbMember.sessionVersion !== cachedData.tenantMember.sessionVersion) {
            await redis.del(cacheKey).catch(() => {});
          } else {
            if (!this.hasRequiredRole(cachedData.tenantMember.memberRole, requiredRole)) {
              await this.auditDenial(tenantId, user.userId, requiredRole, context, 'insufficient_role');
              throw new AppError(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS, 403, ErrorCode.FORBIDDEN);
            }
            await this.postResolveChecks(tenantId, user, cachedData.tenantMember, context);
            return { tenant: cachedData.tenant, tenantMember: cachedData.tenantMember };
          }
        }
      } catch (e: unknown) {
        if (e instanceof AppError) throw e;
        await redis.del(cacheKey).catch(() => {});
      }
    }

    return singleFlight(cacheKey, async () => {
      const tenant = await this.getTenantById(tenantId);
      if (!tenant) {
        await this.recordAuthFailure(tenantId);
        throw new AppError(TenantAuthMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND);
      }
      this.validateTenantStatus(tenant);

      const tenantMember = await this.getTenantMembership(tenantId, user.userId);
      if (!tenantMember) {
        await this.recordAuthFailure(tenantId);
        await this.auditDenial(tenantId, user.userId, requiredRole, context, 'not_member');
        throw new AppError(TenantAuthMessages.USER_NOT_MEMBER_OF_TENANT, 403, ErrorCode.NOT_TENANT_MEMBER);
      }
      this.validateMemberStatus(tenantMember);

      if (!this.hasRequiredRole(tenantMember.memberRole, requiredRole)) {
        await this.recordAuthFailure(tenantId);
        await this.auditDenial(tenantId, user.userId, requiredRole, context, 'insufficient_role');
        throw new AppError(TenantAuthMessages.INSUFFICIENT_TENANT_PERMISSIONS, 403, ErrorCode.FORBIDDEN);
      }

      const ttl = await this.resolveSessionTtl(tenantId);
      await redis.setex(cacheKey, jitter(ttl), JSON.stringify({ tenant, tenantMember })).catch(() => {});
      await this.postResolveChecks(tenantId, user, tenantMember, context);
      await this.auditSuccess(tenantId, user.userId, tenantMember.memberRole, context);
      return { tenant, tenantMember };
    });
  }

  /** Post-resolution security checks (concurrent limit, geo anomaly). */
  private static async postResolveChecks(
    tenantId: string,
    user: SafeUser,
    _member: SafeTenantMember,
    context?: TenantSessionRequestContext,
  ): Promise<void> {
    if (!context) return;
    const ttl = await this.resolveSessionTtl(tenantId);
    await this.assertConcurrentLimit(tenantId, user.userId, context, ttl);
    await this.checkGeoAnomaly(tenantId, user.userId, context);
  }

  private static async auditDenial(
    tenantId: string, userId: string, requiredRole: TenantMemberRole,
    context: TenantSessionRequestContext | undefined, reason: string,
  ): Promise<void> {
    await AuditLogService.log({
      tenantId, actorId: userId, actorType: 'USER', action: 'tenant.session.denied',
      severity: 'medium', resourceType: 'tenant', resourceId: tenantId,
      ipAddress: context?.ip ?? null, userAgent: context?.userAgent ?? null,
      metadata: { reason, requiredRole },
    }).catch((e: unknown) => Logger.warn(`[tenant_session] audit denial failed: ${e instanceof Error ? e.message : e}`));
  }

  private static async auditSuccess(
    tenantId: string, userId: string, role: TenantMemberRole,
    context: TenantSessionRequestContext | undefined,
  ): Promise<void> {
    await AuditLogService.log({
      tenantId, actorId: userId, actorType: 'USER', action: 'tenant.session.resolved',
      severity: 'low', resourceType: 'tenant', resourceId: tenantId,
      ipAddress: context?.ip ?? null, userAgent: context?.userAgent ?? null,
      metadata: { role },
    }).catch((e: unknown) => Logger.warn(`[tenant_session] audit success failed: ${e instanceof Error ? e.message : e}`));
  }

  /**
   * Batched, single-query tenant resolution for a user's memberships. Tenant
   * rows live in the canonical registry (system datasource), so we load all of
   * them with one `IN (...)` query instead of issuing one round-trip per
   * membership (the previous N+1 loop).
   */
  static async getUserTenants(userId: string): Promise<Array<{ tenant: SafeTenant; tenantMember: SafeTenantMember }>> {
    const ds = await getDataSource();
    const members = await ds.getRepository(TenantMemberEntity).find({
      where: { userId, memberStatus: 'ACTIVE', deletedAt: IsNull() },
    });
    if (members.length === 0) return [];

    const tenantIds = [...new Set(members.map((m) => m.tenantId))];
    const tenants = await ds.getRepository(TenantEntity).find({ where: { tenantId: In(tenantIds) } });
    const byId = new Map(tenants.map((t) => [t.tenantId, t]));

    const results: Array<{ tenant: SafeTenant; tenantMember: SafeTenantMember }> = [];
    for (const m of members) {
      const tenant = byId.get(m.tenantId);
      if (tenant && tenant.tenantStatus === 'ACTIVE') {
        results.push({ tenant: SafeTenantSchema.parse(tenant), tenantMember: SafeTenantMemberSchema.parse(m) });
      }
    }
    return results;
  }

  static async clearTenantCache(userId: string, tenantId: string): Promise<void> {
    await redis.del(`tenant:member:${userId}:${tenantId}`);
  }

  /**
   * Invalidate every cached membership for a user. Uses a non-blocking `SCAN`
   * cursor + `UNLINK` instead of the O(N) blocking `KEYS` command so a power
   * user's cache flush can't stall the shared Redis instance.
   */
  static async clearUserTenantCaches(userId: string): Promise<void> {
    const pattern = `tenant:member:${userId}:*`;
    let cursor = '0';
    do {
      try {
        const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = next;
        if (keys.length > 0) await redis.unlink(...keys).catch(() => {});
      } catch {
        break; // fail-open: skip flush if Redis is unavailable
      }
    } while (cursor !== '0');
  }
}
