import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { PlanFeature as PlanFeatureEntity } from '@kuraykaraaslan/payment/server/entities/plan_feature.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import Logger from '@kuraykaraaslan/logger';
import { TenantUsageService, type TenantUsageMetric } from '@kuraykaraaslan/tenant_usage/server/tenant_usage.service';
import type { FeatureAccessResult } from './tenant_subscription.types';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { getFeatureCache, setFeatureCache, logFeatureAccess } from './tenant_subscription.feature.cache';

export async function checkFeatureAccess(
  tenantId: string,
  featureKey: string,
  currentCount?: number,
  options?: { gracePercent?: number },
): Promise<FeatureAccessResult> {
  const ACTIVE_STATUSES = ['ACTIVE', 'TRIALING'];

  const DENIED_BOOLEAN: FeatureAccessResult = {
    allowed: false,
    featureKey,
    type: 'BOOLEAN',
    limit: null,
    unlimited: null,
    current: null,
  };

  try {
    let cached = await getFeatureCache(tenantId);

    if (!cached) {
      const ds = await tenantDataSourceFor(tenantId);
      const sub = await ds.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId } });

      if (!sub) {
        logFeatureAccess(tenantId, DENIED_BOOLEAN);
        return DENIED_BOOLEAN;
      }

      const features = await ds.getRepository(PlanFeatureEntity).find({
        where: { tenantId, planId: sub.planId },
        select: ['key', 'type', 'value'],
      });

      await setFeatureCache(tenantId, sub.status, sub.gracePeriodEndsAt ?? null, features);
      cached = { status: sub.status, gracePeriodEndsAt: sub.gracePeriodEndsAt?.toISOString() ?? null, features };
    }

    const isInGracePeriod =
      cached.status === 'PAST_DUE' &&
      cached.gracePeriodEndsAt !== null &&
      new Date(cached.gracePeriodEndsAt) > new Date();

    if (!ACTIVE_STATUSES.includes(cached.status) && !isInGracePeriod) {
      logFeatureAccess(tenantId, DENIED_BOOLEAN);
      return DENIED_BOOLEAN;
    }

    const feature = cached.features.find((f) => f.key === featureKey);
    if (!feature) {
      logFeatureAccess(tenantId, DENIED_BOOLEAN);
      return DENIED_BOOLEAN;
    }

    let result: FeatureAccessResult;

    if (feature.type === 'BOOLEAN') {
      result = {
        allowed: feature.value === 'true',
        featureKey,
        type: 'BOOLEAN',
        limit: null,
        unlimited: null,
        current: null,
      };
    } else {
      const gracePercent = options?.gracePercent ?? 0;
      const limit = parseInt(feature.value, 10);
      const unlimited = limit === -1;
      const current = currentCount ?? null;
      const graceCeiling = unlimited ? -1 : limit + Math.floor(limit * gracePercent / 100);
      const inGrace = !unlimited && current !== null && current >= limit && current < graceCeiling;
      const allowed = currentCount !== undefined
        ? unlimited || currentCount < graceCeiling
        : true;
      result = {
        allowed,
        featureKey,
        type: 'LIMIT',
        limit,
        unlimited,
        current,
        gracePercent,
        effectiveLimit: graceCeiling,
        inGrace,
      };
    }

    logFeatureAccess(tenantId, result);
    return result;
  } catch (error) {
    Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_CHECK_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof AppError) throw error;
    throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_CHECK_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }
}

export async function assertFeatureAccess(
  tenantId: string,
  featureKey: string,
  currentCount?: number,
  options?: { gracePercent?: number },
): Promise<FeatureAccessResult> {
  const result = await checkFeatureAccess(tenantId, featureKey, currentCount, options);

  if (!result.allowed) {
    const message = result.type === 'LIMIT'
      ? SUBSCRIPTION_MESSAGES.FEATURE_LIMIT_REACHED
      : SUBSCRIPTION_MESSAGES.FEATURE_ACCESS_DENIED;
    throw new AppError(message, 403, ErrorCode.FEATURE_NOT_AVAILABLE);
  }

  return result;
}

/**
 * Real-time usage gating: read the tenant's live `TenantUsage` counter for
 * `usageMetric` and assert it is within the plan's LIMIT for `featureKey`.
 * Callers no longer have to fetch and pass the current count themselves.
 */
export async function assertUsageWithinLimit(
  tenantId: string,
  featureKey: string,
  usageMetric: TenantUsageMetric,
  options?: { gracePercent?: number },
): Promise<FeatureAccessResult> {
  const usage = await TenantUsageService.getUsage(tenantId);
  const current = (usage as unknown as Record<string, number>)[usageMetric] ?? 0;
  return assertFeatureAccess(tenantId, featureKey, current, options);
}
