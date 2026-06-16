import Logger from '@nb/logger';
import redis from '@nb/redis';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import type { FeatureAccessResult } from './tenant_subscription.types';

const FEATURE_CACHE_PREFIX = 'feature:sub:';
const FEATURE_CACHE_TTL = 300;

export function featureCacheKey(tenantId: string): string {
  return `${FEATURE_CACHE_PREFIX}${tenantId}`;
}

export interface CachedFeatureState {
  status: string;
  gracePeriodEndsAt: string | null;
  features: Array<{ key: string; type: string; value: string }>;
}

export async function getFeatureCache(tenantId: string): Promise<CachedFeatureState | null> {
  try {
    const raw = await redis.get(featureCacheKey(tenantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setFeatureCache(
  tenantId: string,
  status: string,
  gracePeriodEndsAt: Date | null | undefined,
  features: Array<{ key: string; type: string; value: string }>,
): Promise<void> {
  try {
    await redis.set(
      featureCacheKey(tenantId),
      JSON.stringify({ status, gracePeriodEndsAt: gracePeriodEndsAt?.toISOString() ?? null, features }),
      'EX',
      FEATURE_CACHE_TTL,
    );
  } catch (err) {
    Logger.warn(`Feature cache set failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function invalidateFeatureCache(tenantId: string): Promise<void> {
  try {
    await redis.del(featureCacheKey(tenantId));
  } catch (err) {
    Logger.warn(`Feature cache invalidation failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function logFeatureAccess(tenantId: string, result: FeatureAccessResult): void {
  AuditLogService.log({
    tenantId,
    actorType: 'SYSTEM',
    action: 'feature.access.checked',
    resourceType: 'PlanFeature',
    resourceId: result.featureKey,
    metadata: result as object,
  }).catch((err) =>
    Logger.error(`Feature access audit log failed: ${err instanceof Error ? err.message : String(err)}`)
  );
}
