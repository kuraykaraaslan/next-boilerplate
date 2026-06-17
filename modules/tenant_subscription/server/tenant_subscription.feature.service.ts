import 'reflect-metadata';
import type { TenantUsageMetric } from '@kuraykaraaslan/tenant_usage/server/tenant_usage.service';
import type { FeatureAccessResult } from './tenant_subscription.types';
import { invalidateFeatureCache } from './tenant_subscription.feature.cache';
import { getDefaultPlanId, setDefaultPlanId } from './tenant_subscription.feature.plan';
import { checkFeatureAccess, assertFeatureAccess, assertUsageWithinLimit } from './tenant_subscription.feature.access';

/**
 * Feature gating for tenant subscriptions: the Redis-cached access checks
 * (`checkFeatureAccess` / `assertFeatureAccess`) consumed by other modules as a
 * billing gate, plus cache invalidation and the system default-plan setting.
 *
 * The implementation is split across focused modules (`tenant_subscription.feature.cache`
 * Redis cache + audit, `tenant_subscription.feature.plan` default-plan setting,
 * `tenant_subscription.feature.access` check/assert/usage); this class preserves
 * the single `TenantFeatureGateService.*` entry point its callers depend on.
 */
export default class TenantFeatureGateService {
  static getDefaultPlanId(): Promise<string | null> {
    return getDefaultPlanId();
  }

  static setDefaultPlanId(planId: string | null): Promise<void> {
    return setDefaultPlanId(planId);
  }

  static invalidateFeatureCache(tenantId: string): Promise<void> {
    return invalidateFeatureCache(tenantId);
  }

  static checkFeatureAccess(
    tenantId: string,
    featureKey: string,
    currentCount?: number,
    options?: { gracePercent?: number },
  ): Promise<FeatureAccessResult> {
    return checkFeatureAccess(tenantId, featureKey, currentCount, options);
  }

  static assertFeatureAccess(
    tenantId: string,
    featureKey: string,
    currentCount?: number,
    options?: { gracePercent?: number },
  ): Promise<FeatureAccessResult> {
    return assertFeatureAccess(tenantId, featureKey, currentCount, options);
  }

  static assertUsageWithinLimit(
    tenantId: string,
    featureKey: string,
    usageMetric: TenantUsageMetric,
    options?: { gracePercent?: number },
  ): Promise<FeatureAccessResult> {
    return assertUsageWithinLimit(tenantId, featureKey, usageMetric, options);
  }
}
