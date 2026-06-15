import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { ApiKey as ApiKeyEntity } from './entities/api_key.entity';
import { SafeApiKey, SafeApiKeySchema } from './api_key.types';
import type { CreateApiKeyInput, UpdateApiKeyInput, ListApiKeysInput } from './api_key.dto';
import ApiKeyMessages from './api_key.messages';
import type { ApiKeyEnv } from './api_key.enums';
import { scopesWithinAllowlist } from './api_key.enums';
import { isRootTenant } from '@/modules/tenant/tenant.constants';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import WebhookService from '@/modules/webhook/webhook.service';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { DEFAULT_KEY_ENV, generateRawKey, hashKey } from './api_key.crypto';
import { API_KEY_CACHE_TTL, clearCache } from './api_key.cache';
import { assertUnderKeyLimit, getTenantPolicy, resolveExpiry } from './api_key.policy';

export async function list({ tenantId, page, pageSize }: ListApiKeysInput): Promise<{ keys: SafeApiKey[]; total: number }> {
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

export async function getById(tenantId: string, apiKeyId: string): Promise<SafeApiKey> {
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

export async function create(
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

  const policy = await getTenantPolicy(tenantId);
  const expiresAt = resolveExpiry(input.expiresAt, policy);

  // Per-plan scope allowlist: a tenant can never mint a key with scopes
  // beyond what its plan permits (prevents privilege escalation).
  if (!scopesWithinAllowlist(input.scopes, policy.allowedScopes)) {
    throw new AppError(ApiKeyMessages.SCOPE_NOT_ALLOWED, 403, ErrorCode.FORBIDDEN);
  }

  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ApiKeyEntity);

  await assertUnderKeyLimit(tenantId, repo, policy.maxActiveKeys);

  const environment: ApiKeyEnv = input.environment ?? DEFAULT_KEY_ENV;
  const rawKey = generateRawKey(tenantId, environment);
  const keyHash = hashKey(rawKey);

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

export async function update(
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
  await clearCache({ apiKeyId: saved.apiKeyId, tenantId: saved.tenantId, keyHash: beforeHash });

  await WebhookService.dispatchEvent(tenantId, 'api_key.updated', {
    apiKeyId: saved.apiKeyId,
    name: saved.name,
    isActive: saved.isActive,
    deactivated: wasActive && !saved.isActive,
  }).catch(() => {});

  return SafeApiKeySchema.parse(saved);
}

export async function remove(tenantId: string, apiKeyId: string): Promise<void> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ApiKeyEntity);

  const row = await repo.findOne({ where: { apiKeyId, tenantId } });
  if (!row) throw new AppError(ApiKeyMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  await repo.remove(row);
  await clearCache({ apiKeyId, tenantId, keyHash: row.keyHash });
  await WebhookService.dispatchEvent(tenantId, 'api_key.deleted', {
    apiKeyId,
    name: row.name,
  }).catch(() => {});
}
