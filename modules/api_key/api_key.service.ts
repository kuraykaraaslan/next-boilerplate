import 'reflect-metadata';
import crypto from 'crypto';
import { tenantDataSourceFor, getDataSource } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import { ApiKey as ApiKeyEntity } from './entities/api_key.entity';
import { SafeApiKey, SafeApiKeySchema } from './api_key.types';
import type { CreateApiKeyInput, UpdateApiKeyInput, ListApiKeysInput } from './api_key.dto';
import ApiKeyMessages from './api_key.messages';
import type { ApiKeyScope } from './api_key.enums';
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { isRootTenant } from '@/modules/tenant/tenant.constants';

const API_KEY_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5);
const NEGATIVE_CACHE_TTL = Math.min(60, API_KEY_CACHE_TTL);
const NEG = '__not_found__';

export default class ApiKeyService {

  private static async clearCache(apiKey: { apiKeyId: string; keyHash?: string; tenantId?: string }) {
    const ops: Promise<unknown>[] = [
      redis.del(`api_key:id:${apiKey.apiKeyId}`),
    ];
    if (apiKey.keyHash) ops.push(redis.del(`api_key:hash:${apiKey.keyHash}`));
    if (apiKey.tenantId) ops.push(redis.del(`api_key:tenant:${apiKey.tenantId}:${apiKey.apiKeyId}`));
    await Promise.all(ops.map((p) => p.catch(() => {})));
  }

  static generateRawKey(tenantId: string): string {
    const prefix = tenantId.replace(/-/g, '').slice(0, 8);
    const secret = crypto.randomBytes(24).toString('hex');
    return `sk_live_${prefix}_${secret}`;
  }

  static hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  static extractPrefix(rawKey: string): string {
    return rawKey.slice(0, 20);
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
      if (!row) throw new Error(ApiKeyMessages.NOT_FOUND);

      const parsed = SafeApiKeySchema.parse(row);
      await redis.setex(cacheKey, jitter(API_KEY_CACHE_TTL), JSON.stringify(parsed)).catch(() => {});
      return parsed;
    });
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
      await TenantSubscriptionService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_API_KEYS);
    }

    const rawKey = ApiKeyService.generateRawKey(tenantId);
    const keyHash = ApiKeyService.hashKey(rawKey);
    const keyPrefix = ApiKeyService.extractPrefix(rawKey);

    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const entity = repo.create({
      tenantId,
      createdByUserId,
      name: input.name,
      description: input.description ?? null,
      keyHash,
      keyPrefix,
      scopes: input.scopes,
      isActive: true,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });

    const saved = await repo.save(entity);
    await redis.del(`api_key:hash:${keyHash}`).catch(() => {});
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
    if (!row) throw new Error(ApiKeyMessages.NOT_FOUND);

    const beforeHash = row.keyHash;

    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description ?? null;
    if (input.isActive !== undefined) row.isActive = input.isActive;

    const saved = await repo.save(row);
    await this.clearCache({ apiKeyId: saved.apiKeyId, tenantId: saved.tenantId, keyHash: beforeHash });
    return SafeApiKeySchema.parse(saved);
  }

  static async delete(tenantId: string, apiKeyId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(ApiKeyEntity);

    const row = await repo.findOne({ where: { apiKeyId, tenantId } });
    if (!row) throw new Error(ApiKeyMessages.NOT_FOUND);

    await repo.remove(row);
    await this.clearCache({ apiKeyId, tenantId, keyHash: row.keyHash });
  }

  /**
   * Verify a raw API key from an incoming request.
   * Updates lastUsedAt on success.
   * Throws with a descriptive message on any failure.
   *
   * Negative cache: an unknown hash is cached as `__not_found__` for a short window to blunt
   * credential-stuffing — repeated guesses hit Redis, not the DB.
   */
  static async verify(rawKey: string, requiredScope?: ApiKeyScope): Promise<SafeApiKey> {
    const hash = ApiKeyService.hashKey(rawKey);
    const cacheKey = `api_key:hash:${hash}`;

    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached === NEG) throw new Error(ApiKeyMessages.INVALID_KEY);

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
          await redis.setex(cacheKey, jitter(NEGATIVE_CACHE_TTL), NEG).catch(() => {});
          return null;
        }
        await redis.setex(cacheKey, jitter(API_KEY_CACHE_TTL), JSON.stringify(found)).catch(() => {});
        return found;
      });
      if (!row) throw new Error(ApiKeyMessages.INVALID_KEY);
    }

    if (!row.isActive) throw new Error(ApiKeyMessages.KEY_INACTIVE);

    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      throw new Error(ApiKeyMessages.KEY_EXPIRED);
    }

    if (requiredScope && !row.scopes.includes(requiredScope)) {
      throw new Error(ApiKeyMessages.INSUFFICIENT_SCOPE);
    }

    const ds = await getDataSource();
    ds.getRepository(ApiKeyEntity)
      .update({ apiKeyId: row.apiKeyId }, { lastUsedAt: new Date() })
      .catch(() => {});

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
  static async verifyFromAuthHeader(
    request: { headers: { get: (name: string) => string | null } },
    tenantId?: string,
    requiredScope?: ApiKeyScope,
  ): Promise<SafeApiKey> {
    const header = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!header) throw new Error(ApiKeyMessages.INVALID_KEY);

    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) throw new Error(ApiKeyMessages.INVALID_KEY);

    const rawKey = match[1].trim();
    if (!rawKey) throw new Error(ApiKeyMessages.INVALID_KEY);

    const key = await ApiKeyService.verify(rawKey, requiredScope);

    if (tenantId && key.tenantId !== tenantId) {
      throw new Error(ApiKeyMessages.INVALID_KEY);
    }
    return key;
  }
}
