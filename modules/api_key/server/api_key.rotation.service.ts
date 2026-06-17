import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import redis from '@kuraykaraaslan/redis';
import { ApiKey as ApiKeyEntity } from './entities/api_key.entity';
import { SafeApiKey, SafeApiKeySchema } from './api_key.types';
import type { RotateApiKeyInput } from './api_key.dto';
import ApiKeyMessages from './api_key.messages';
import type { ApiKeyEnv } from './api_key.enums';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { DEFAULT_KEY_ENV, generateRawKey, hashKey } from './api_key.crypto';
import { clearCache } from './api_key.cache';
import { DAY_MS } from './api_key.policy';

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
export async function rotate(
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
  const rawKey = generateRawKey(tenantId, environment);
  const keyHash = hashKey(rawKey);

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

  await clearCache({ apiKeyId: old.apiKeyId, tenantId, keyHash: old.keyHash });
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
export async function revokeAll(tenantId: string, actorUserId?: string): Promise<number> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ApiKeyEntity);

  const active = await repo.find({ where: { tenantId, isActive: true } });
  if (active.length === 0) return 0;

  await repo.update({ tenantId, isActive: true }, { isActive: false });
  await Promise.all(active.map((k) => clearCache({ apiKeyId: k.apiKeyId, tenantId, keyHash: k.keyHash })));

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
export async function sweepExpired(tenantId: string): Promise<number> {
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
    await clearCache({ apiKeyId: k.apiKeyId, tenantId, keyHash: k.keyHash });
    await WebhookService.dispatchEvent(tenantId, 'api_key.expired', {
      apiKeyId: k.apiKeyId,
      name: k.name,
      expiredAt: k.expiresAt?.toISOString() ?? null,
    }).catch(() => {});
  }));

  return expired.length;
}

/**
 * Rotation reminder: emit `api_key.expiring` for active keys whose expiry
 * falls within `withinDays`. De-duplicated per key per day via a Redis marker
 * so a daily cron does not spam consumers. Returns the number of reminders.
 */
export async function sweepExpiringSoon(tenantId: string, withinDays = 7): Promise<number> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(ApiKeyEntity);

  const now = new Date();
  const horizon = new Date(now.getTime() + withinDays * DAY_MS);
  const soon = await repo
    .createQueryBuilder('k')
    .where('k.tenantId = :tenantId', { tenantId })
    .andWhere('k.isActive = :active', { active: true })
    .andWhere('k.expiresAt IS NOT NULL')
    .andWhere('k.expiresAt > :now', { now })
    .andWhere('k.expiresAt <= :horizon', { horizon })
    .getMany();

  let sent = 0;
  for (const k of soon) {
    const day = new Date().toISOString().slice(0, 10);
    const dedupeKey = `api_key:expiring:${k.apiKeyId}:${day}`;
    // Only notify once per key per day (NX marker, 2-day TTL).
    const first = await redis.set(dedupeKey, '1', 'EX', 2 * 86_400, 'NX').catch(() => 'OK');
    if (first !== 'OK') continue;
    const daysLeft = Math.max(0, Math.ceil(((k.expiresAt as Date).getTime() - now.getTime()) / DAY_MS));
    await WebhookService.dispatchEvent(tenantId, 'api_key.expiring', {
      apiKeyId: k.apiKeyId,
      name: k.name,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      daysLeft,
    }).catch(() => {});
    sent += 1;
  }
  return sent;
}
