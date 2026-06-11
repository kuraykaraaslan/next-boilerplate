import 'reflect-metadata';
import crypto from 'crypto';
import { tenantDataSourceFor, getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { ApiKey as ApiKeyEntity } from './entities/api_key.entity';
import { SafeApiKey, SafeApiKeySchema } from './api_key.types';
import type { CreateApiKeyInput, UpdateApiKeyInput, ListApiKeysInput, RotateApiKeyInput } from './api_key.dto';
import ApiKeyMessages from './api_key.messages';
import type { ApiKeyScope, ApiKeyEnv } from './api_key.enums';
import { API_KEY_SETTING_KEYS } from './api_key.setting.keys';
import { ipMatchesAllowlist, parseAllowlistString } from './api_key.net';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { isRootTenant, ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import WebhookService from '@/modules/webhook/webhook.service';
import SettingService from '@/modules/setting/setting.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';

const API_KEY_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
const NEG = '__not_found__';
const DAY_MS = 24 * 60 * 60 * 1000;

// Keys unused for this long that then verify from a brand-new IP are flagged as
// a usage anomaly (possible credential leak after dormancy).
const ANOMALY_DORMANCY_DAYS = 14;

// Default raw-key environment, derived from the deployment mode. A prod/vercel
// deployment mints `sk_live_…`; everything else mints `sk_test_…` so test keys
// can never be confused with production ones.
const DEFAULT_KEY_ENV: ApiKeyEnv =
  env.NODE_ENV === 'production' || env.NODE_ENV === 'vercel' ? 'live' : 'test';

/** Optional request context for {@link ApiKeyService.verify}. */
export interface VerifyContext {
  /** Source IP of the caller (for allowlist + anomaly detection). */
  ip?: string | null;
}

export default class ApiKeyService {

  // In-memory cache for the platform-wide negative-cache TTL. Avoids a settings
  // read on every verify; refreshed lazily once per minute.
  private static negTtlCache: { value: number; expiresAt: number } | null = null;

  private static async clearCache(apiKey: { apiKeyId: string; keyHash?: string; tenantId?: string }) {
    const ops: Promise<unknown>[] = [
      redis.del(`api_key:id:${apiKey.apiKeyId}`),
    ];
    if (apiKey.keyHash) ops.push(redis.del(`api_key:hash:${apiKey.keyHash}`));
    if (apiKey.tenantId) ops.push(redis.del(`api_key:tenant:${apiKey.tenantId}:${apiKey.apiKeyId}`));
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  /**
   * Platform-wide negative-cache TTL, wired from the root tenant's
   * `apiKeyNegativeCacheTtlSeconds` setting (floored at 60s, never larger than
   * the positive cache TTL). Falls back to the previous hardcoded default when
   * the setting is unset or unreadable.
   */
  static async getNegativeCacheTtl(): Promise<number> {
    const fallback = Math.min(60, API_KEY_CACHE_TTL);
    const now = Date.now();
    if (this.negTtlCache && this.negTtlCache.expiresAt > now) return this.negTtlCache.value;
    let value = fallback;
    try {
      const raw = await SettingService.getValue(ROOT_TENANT_ID, API_KEY_SETTING_KEYS.NEGATIVE_CACHE_TTL_SECONDS);
      const parsed = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed) && parsed >= 60) value = Math.min(parsed, API_KEY_CACHE_TTL);
    } catch {
      /* keep fallback */
    }
    this.negTtlCache = { value, expiresAt: now + 60_000 };
    return value;
  }

  static generateRawKey(tenantId: string, environment: ApiKeyEnv = DEFAULT_KEY_ENV): string {
    const prefix = tenantId.replace(/-/g, '').slice(0, 8);
    const secret = crypto.randomBytes(24).toString('hex');
    return `sk_${environment}_${prefix}_${secret}`;
  }

  static hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  static async list({ tenantId, page, pageSize }: ListApiKeysInput): Promise<{ keys: SafeApiKey[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const safePage = Math.max(1, page);
    const [rows, total] = await repo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return { keys: rows.map((r) => SafeApiKeySchema.parse(r)), total };
  }

  static async getById(tenantId: string, apiKeyId: string): Promise<SafeApiKey> {
    const cacheKey = `api_key:tenant:${tenantId}:${apiKeyId}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try { return SafeApiKeySchema.parse(JSON.parse(cached)); } catch { await redis.del(cacheKey).catch(() => {}); }
    }

    return singleFlight(cacheKey, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const row = await ds.getRepository(ApiKeyEntity).findOne({ where: { apiKeyId, tenantId } });
      if (!row) throw new AppError(ApiKeyMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

      const parsed = SafeApiKeySchema.parse(row);
      await redis.setex(cacheKey, jitter(API_KEY_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
  }

  // ============================================================================
  // Per-tenant policy resolution (max keys, max TTL, require-expiry)
  // ============================================================================

  private static async getTenantPolicy(tenantId: string): Promise<{
    maxActiveKeys: number;
    maxTtlDays: number;
    requireExpiry: boolean;
    tenantIpAllowlist: string[];
    defaultRateLimitPerMinute: number;
  }> {
    const keys = [
      API_KEY_SETTING_KEYS.MAX_ACTIVE_KEYS,
      API_KEY_SETTING_KEYS.MAX_TTL_DAYS,
      API_KEY_SETTING_KEYS.REQUIRE_EXPIRY,
      API_KEY_SETTING_KEYS.TENANT_IP_ALLOWLIST,
      API_KEY_SETTING_KEYS.DEFAULT_RATE_LIMIT_PER_MINUTE,
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
      tenantIpAllowlist: parseAllowlistString(values[API_KEY_SETTING_KEYS.TENANT_IP_ALLOWLIST]),
      defaultRateLimitPerMinute: num(API_KEY_SETTING_KEYS.DEFAULT_RATE_LIMIT_PER_MINUTE),
    };
  }

  /**
   * Validate and normalise the requested expiry against tenant lifecycle policy.
   * Throws when the tenant requires an expiry and none was given, or when the
   * requested expiry exceeds the tenant's maximum key lifetime.
   */
  private static resolveExpiry(
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

  private static async assertUnderKeyLimit(tenantId: string, repo: ReturnType<Awaited<ReturnType<typeof tenantDataSourceFor>>['getRepository']>, maxActiveKeys: number): Promise<void> {
    if (maxActiveKeys <= 0) return;
    const active = await (repo as any).count({ where: { tenantId, isActive: true } });
    if (active >= maxActiveKeys) {
      throw new AppError(ApiKeyMessages.MAX_KEYS_REACHED, 422, ErrorCode.VALIDATION_ERROR);
    }
  }

  static async create(
    tenantId: string,
    createdByUserId: string,
    input: CreateApiKeyInput,
  ): Promise<{ key: SafeApiKey; rawKey: string }> {
    // Defense-in-depth billing gate — the tenant plan must include
    // `feature_api_keys`. Root tenant is short-circuited (the platform
    // owner does not buy its own plan).
    if (!isRootTenant(tenantId)) {
      await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_API_KEYS);
    }

    const policy = await this.getTenantPolicy(tenantId);
    const expiresAt = this.resolveExpiry(input.expiresAt, policy);

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    await this.assertUnderKeyLimit(tenantId, repo, policy.maxActiveKeys);

    const environment: ApiKeyEnv = input.environment ?? DEFAULT_KEY_ENV;
    const rawKey = ApiKeyService.generateRawKey(tenantId, environment);
    const keyHash = ApiKeyService.hashKey(rawKey);

    const entity = repo.create({
      tenantId,
      createdByUserId,
      name: input.name,
      description: input.description ?? null,
      keyHash,
      scopes: input.scopes,
      keyEnv: environment,
      ipAllowlist: input.ipAllowlist ?? [],
      isActive: true,
      usageCount: 0,
      lastUsedIp: null,
      successorKeyId: null,
      expiresAt,
    });

    const saved = await repo.save(entity);
    await redis.del(`api_key:hash:${keyHash}`).catch(() => {});
    await WebhookService.dispatchEvent(tenantId, 'api_key.created', {
      apiKeyId: saved.apiKeyId,
      name: saved.name,
      scopes: saved.scopes,
      environment,
      createdByUserId,
    }).catch(() => {});
    return { key: SafeApiKeySchema.parse(saved), rawKey };
  }

  static async update(
    tenantId: string,
    apiKeyId: string,
    input: UpdateApiKeyInput,
  ): Promise<SafeApiKey> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const row = await repo.findOne({ where: { apiKeyId, tenantId } });
    if (!row) throw new AppError(ApiKeyMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const beforeHash = row.keyHash;
    const wasActive = row.isActive;

    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description ?? null;
    if (input.ipAllowlist !== undefined) row.ipAllowlist = input.ipAllowlist;
    if (input.isActive !== undefined) row.isActive = input.isActive;

    const saved = await repo.save(row);
    await this.clearCache({ apiKeyId: saved.apiKeyId, tenantId: saved.tenantId, keyHash: beforeHash });

    await WebhookService.dispatchEvent(tenantId, 'api_key.updated', {
      apiKeyId: saved.apiKeyId,
      name: saved.name,
      isActive: saved.isActive,
      deactivated: wasActive && !saved.isActive,
    }).catch(() => {});

    return SafeApiKeySchema.parse(saved);
  }

  static async delete(tenantId: string, apiKeyId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const row = await repo.findOne({ where: { apiKeyId, tenantId } });
    if (!row) throw new AppError(ApiKeyMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    await repo.remove(row);
    await this.clearCache({ apiKeyId, tenantId, keyHash: row.keyHash });
    await WebhookService.dispatchEvent(tenantId, 'api_key.deleted', {
      apiKeyId,
      name: row.name,
    }).catch(() => {});
  }

  // ============================================================================
  // Rotation — mint a successor and grace-expire the old key
  // ============================================================================

  /**
   * Zero-downtime rotation: issues a brand-new key inheriting the old key's
   * scopes / IP allowlist / environment, then sets the old key to expire after
   * `graceSeconds` (or deactivates it immediately when `graceSeconds === 0`).
   * Both keys verify successfully during the grace window so consumers can
   * cut over without an outage.
   */
  static async rotate(
    tenantId: string,
    apiKeyId: string,
    createdByUserId: string,
    input: RotateApiKeyInput,
  ): Promise<{ key: SafeApiKey; rawKey: string }> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const old = await repo.findOne({ where: { apiKeyId, tenantId } });
    if (!old) throw new AppError(ApiKeyMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const environment = (old.keyEnv as ApiKeyEnv) || DEFAULT_KEY_ENV;
    const rawKey = ApiKeyService.generateRawKey(tenantId, environment);
    const keyHash = ApiKeyService.hashKey(rawKey);

    const successor = await repo.save(repo.create({
      tenantId,
      createdByUserId,
      name: `${old.name} (rotated)`,
      description: old.description,
      keyHash,
      scopes: old.scopes,
      keyEnv: environment,
      ipAllowlist: old.ipAllowlist ?? [],
      isActive: true,
      usageCount: 0,
      lastUsedIp: null,
      successorKeyId: null,
      expiresAt: old.expiresAt,
    }));

    const graceSeconds = input.graceSeconds ?? 0;
    old.successorKeyId = successor.apiKeyId;
    if (graceSeconds <= 0) {
      old.isActive = false;
    } else {
      const graceEnd = new Date(Date.now() + graceSeconds * 1000);
      // Honour any earlier existing expiry — never extend a key during rotation.
      old.expiresAt = old.expiresAt && old.expiresAt < graceEnd ? old.expiresAt : graceEnd;
    }
    await repo.save(old);

    await this.clearCache({ apiKeyId: old.apiKeyId, tenantId, keyHash: old.keyHash });
    await redis.del(`api_key:hash:${keyHash}`).catch(() => {});

    await WebhookService.dispatchEvent(tenantId, 'api_key.rotated', {
      apiKeyId: old.apiKeyId,
      successorKeyId: successor.apiKeyId,
      graceSeconds,
    }).catch(() => {});

    return { key: SafeApiKeySchema.parse(successor), rawKey };
  }

  // ============================================================================
  // Emergency revoke-all (incident response)
  // ============================================================================

  /**
   * Deactivate every active key for a tenant in one atomic operation and flush
   * their cache entries. Intended for breach response. Returns the number of
   * keys revoked.
   */
  static async revokeAll(tenantId: string, actorUserId?: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const active = await repo.find({ where: { tenantId, isActive: true } });
    if (active.length === 0) return 0;

    await repo.update({ tenantId, isActive: true }, { isActive: false });
    await Promise.all(active.map((k) => this.clearCache({ apiKeyId: k.apiKeyId, tenantId, keyHash: k.keyHash })));

    AuditLogService.log({
      tenantId,
      actorId: actorUserId ?? null,
      actorType: actorUserId ? 'USER' : 'SYSTEM',
      action: 'api_key.revoke_all',
      resourceType: 'ApiKey',
      metadata: { revokedCount: active.length },
    }).catch(() => {});

    await WebhookService.dispatchEvent(tenantId, 'api_key.updated', {
      revokedAll: true,
      revokedCount: active.length,
    }).catch(() => {});

    return active.length;
  }

  // ============================================================================
  // Expiry sweep (background enforcement)
  // ============================================================================

  /**
   * Deactivate keys whose `expiresAt` has passed but are still flagged active,
   * emitting an `api_key.expired` webhook per key. Meant to be invoked by a
   * scheduled job per tenant; `verify` already rejects expired keys at request
   * time, so this is about state hygiene and notifying webhook consumers.
   */
  static async sweepExpired(tenantId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const now = new Date();
    const expired = await repo
      .createQueryBuilder('k')
      .where('k.tenantId = :tenantId', { tenantId })
      .andWhere('k.isActive = :active', { active: true })
      .andWhere('k.expiresAt IS NOT NULL')
      .andWhere('k.expiresAt < :now', { now })
      .getMany();

    if (expired.length === 0) return 0;

    await Promise.all(expired.map(async (k) => {
      k.isActive = false;
      await repo.save(k);
      await this.clearCache({ apiKeyId: k.apiKeyId, tenantId, keyHash: k.keyHash });
      await WebhookService.dispatchEvent(tenantId, 'api_key.expired', {
        apiKeyId: k.apiKeyId,
        name: k.name,
        expiredAt: k.expiresAt?.toISOString() ?? null,
      }).catch(() => {});
    }));

    return expired.length;
  }

  // ============================================================================
  // Verification (hot path)
  // ============================================================================

  /**
   * Audit a rejected verification. Best-effort, fire-and-forget. When the key
   * hash matched no row we have no tenant, so the event is recorded against the
   * platform (root) tenant.
   */
  private static auditFailure(reason: string, tenantId: string | null, ip?: string | null, apiKeyId?: string): void {
    AuditLogService.log({
      tenantId: tenantId ?? ROOT_TENANT_ID,
      actorType: 'API_KEY',
      action: 'api_key.verify.failed',
      resourceType: 'ApiKey',
      resourceId: apiKeyId ?? null,
      ipAddress: ip ?? null,
      metadata: { reason },
    }).catch(() => {});
  }

  /** Per-key sliding-window rate limit. Returns true when the call is allowed. */
  private static async withinRateLimit(apiKeyId: string, limitPerMinute: number): Promise<boolean> {
    if (limitPerMinute <= 0) return true;
    const windowKey = `api_key:rl:${apiKeyId}:${Math.floor(Date.now() / 60_000)}`;
    try {
      const count = await redis.incrby(windowKey, 1);
      if (count === 1) await redis.expire(windowKey, 70).catch(() => {});
      return count <= limitPerMinute;
    } catch {
      // Fail open on Redis errors — never let a cache outage lock out valid keys.
      return true;
    }
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
  static async verify(rawKey: string, requiredScope?: ApiKeyScope, ctx?: VerifyContext): Promise<SafeApiKey> {
    const ip = ctx?.ip ?? null;
    const hash = ApiKeyService.hashKey(rawKey);
    const cacheKey = `api_key:hash:${hash}`;

    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached === NEG) {
      this.auditFailure('unknown_key', null, ip);
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
          await redis.setex(cacheKey, jitter(await this.getNegativeCacheTtl()), NEG).catch(() => {});
          return null;
        }
        await redis.setex(cacheKey, jitter(API_KEY_CACHE_TTL), JSON.stringify(found)).catch(() => {});
        return found;
      });
      if (!row) {
        this.auditFailure('unknown_key', null, ip);
        throw new AppError(ApiKeyMessages.INVALID_KEY, 401, ErrorCode.UNAUTHORIZED);
      }
    }

    if (!row.isActive) {
      this.auditFailure('inactive', row.tenantId, ip, row.apiKeyId);
      throw new AppError(ApiKeyMessages.KEY_INACTIVE, 401, ErrorCode.UNAUTHORIZED);
    }

    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      this.auditFailure('expired', row.tenantId, ip, row.apiKeyId);
      throw new AppError(ApiKeyMessages.KEY_EXPIRED, 401, ErrorCode.UNAUTHORIZED);
    }

    if (requiredScope && !row.scopes.includes(requiredScope)) {
      this.auditFailure('insufficient_scope', row.tenantId, ip, row.apiKeyId);
      throw new AppError(ApiKeyMessages.INSUFFICIENT_SCOPE, 403, ErrorCode.FORBIDDEN);
    }

    // Per-key IP allowlist (cheap — lives on the row). Falls back to the
    // tenant-wide default allowlist only when the key declares none.
    let policy: Awaited<ReturnType<typeof ApiKeyService.getTenantPolicy>> | null = null;
    const perKeyAllowlist = row.ipAllowlist ?? [];
    if (perKeyAllowlist.length > 0) {
      if (!ipMatchesAllowlist(ip, perKeyAllowlist)) {
        this.auditFailure('ip_denied', row.tenantId, ip, row.apiKeyId);
        throw new AppError(ApiKeyMessages.IP_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
      }
    } else {
      policy = await this.getTenantPolicy(row.tenantId);
      if (!ipMatchesAllowlist(ip, policy.tenantIpAllowlist)) {
        this.auditFailure('ip_denied', row.tenantId, ip, row.apiKeyId);
        throw new AppError(ApiKeyMessages.IP_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
      }
    }

    // Per-key rate limit (tenant default policy).
    if (!policy) policy = await this.getTenantPolicy(row.tenantId);
    if (!(await this.withinRateLimit(row.apiKeyId, policy.defaultRateLimitPerMinute))) {
      this.auditFailure('rate_limited', row.tenantId, ip, row.apiKeyId);
      throw new AppError(ApiKeyMessages.RATE_LIMITED, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    }

    // Anomaly detection: a dormant key suddenly used from a new IP.
    this.detectAnomaly(row, ip);

    // Record usage (fire-and-forget — never block the request on bookkeeping).
    void this.recordUsage(row.apiKeyId, ip);

    return SafeApiKeySchema.parse(row);
  }

  /** Flag a usage anomaly without blocking the request. */
  private static detectAnomaly(row: ApiKeyEntity, ip: string | null): void {
    if (!ip || ip === 'unknown') return;
    const lastIp = row.lastUsedIp;
    const lastAt = row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : 0;
    const dormantMs = ANOMALY_DORMANCY_DAYS * DAY_MS;
    const newIp = !!lastIp && lastIp !== ip;
    const dormant = lastAt > 0 && Date.now() - lastAt > dormantMs;
    if (newIp && dormant) {
      Logger.warn(`[ApiKey] anomaly: key=${row.apiKeyId} used from new IP ${ip} after ${ANOMALY_DORMANCY_DAYS}d dormancy (prev ${lastIp})`);
      AuditLogService.log({
        tenantId: row.tenantId,
        actorType: 'API_KEY',
        action: 'api_key.anomaly.detected',
        resourceType: 'ApiKey',
        resourceId: row.apiKeyId,
        ipAddress: ip,
        metadata: { previousIp: lastIp, dormantDays: ANOMALY_DORMANCY_DAYS },
      }).catch(() => {});
      WebhookService.dispatchEvent(row.tenantId, 'api_key.updated', {
        apiKeyId: row.apiKeyId,
        anomaly: 'dormant_new_ip',
        ip,
      }).catch(() => {});
    }
  }

  /** Persist lastUsedAt / lastUsedIp and bump the usage counter. */
  private static async recordUsage(apiKeyId: string, ip: string | null): Promise<void> {
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(ApiKeyEntity);
      await repo.update({ apiKeyId }, { lastUsedAt: new Date(), lastUsedIp: ip ?? null });
      await repo.increment({ apiKeyId }, 'usageCount', 1);
      // The cached row carries a stale counter/lastUsed — drop it so the next
      // read reflects reality. (Verification still works off the hash cache.)
      await redis.del(`api_key:id:${apiKeyId}`).catch(() => {});
    } catch {
      /* bookkeeping is best-effort */
    }
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
  /** Best-effort client IP extraction from proxy headers (mirrors Limiter). */
  private static ipFromHeaders(headers: { get: (name: string) => string | null }): string | null {
    return (
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip')?.trim() ||
      null
    );
  }

  static async verifyFromAuthHeader(
    request: { headers: { get: (name: string) => string | null } },
    tenantId?: string,
    requiredScope?: ApiKeyScope,
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
      ip: ctx?.ip ?? ApiKeyService.ipFromHeaders(request.headers),
    };

    const key = await ApiKeyService.verify(rawKey, requiredScope, resolvedCtx);

    if (tenantId && key.tenantId !== tenantId) {
      throw new AppError(ApiKeyMessages.INVALID_KEY, 401, ErrorCode.UNAUTHORIZED);
    }
    return key;
  }
}
