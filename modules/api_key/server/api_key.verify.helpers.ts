import 'reflect-metadata';
import { getDataSource } from '@nb/db';
import redis from '@nb/redis';
import { ApiKey as ApiKeyEntity } from './entities/api_key.entity';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';
import WebhookService from '@nb/webhook/server/webhook.service';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import Logger from '@nb/logger';
import { ANOMALY_DORMANCY_DAYS, DAY_MS } from './api_key.policy';

/**
 * Audit a rejected verification. Best-effort, fire-and-forget. When the key
 * hash matched no row we have no tenant, so the event is recorded against the
 * platform (root) tenant.
 */
export function auditFailure(reason: string, tenantId: string | null, ip?: string | null, apiKeyId?: string): void {
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
export async function withinRateLimit(apiKeyId: string, limitPerMinute: number): Promise<boolean> {
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

/** Flag a usage anomaly without blocking the request. */
export function detectAnomaly(row: ApiKeyEntity, ip: string | null): void {
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
export async function recordUsage(apiKeyId: string, ip: string | null): Promise<void> {
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

/** Best-effort client IP extraction from proxy headers (mirrors Limiter). */
export function ipFromHeaders(headers: { get: (name: string) => string | null }): string | null {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    null
  );
}
