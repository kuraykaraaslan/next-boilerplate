import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { PlanFeature as PlanFeatureEntity } from '../payment/entities/plan_feature.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import Logger from '@/modules/logger';
import redis from '@/modules/redis';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import type { FeatureAccessResult } from './tenant_subscription.types';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import TenantPlanService from './tenant_subscription.plan.service';

/**
 * Feature gating for tenant subscriptions: the Redis-cached access checks
 * (`checkFeatureAccess` / `assertFeatureAccess`) consumed by other modules as a
 * billing gate, plus cache invalidation and the system default-plan setting.
 */
export default class TenantFeatureGateService {

  // ============================================================================
  // Feature Gating — Redis cache + AuditLog
  // ============================================================================

  private static readonly FEATURE_CACHE_PREFIX = 'feature:sub:';
  private static readonly FEATURE_CACHE_TTL = 300;

  private static featureCacheKey(tenantId: string): string {
    return `${this.FEATURE_CACHE_PREFIX}${tenantId}`;
  }

  // ============================================================================
  // Default Plan (system setting `defaultPlanId`, stored on the ROOT tenant)
  // ============================================================================

  /**
   * The ROOT-catalogue plan auto-assigned (for free) to newly created tenants.
   * Returns null when no default has been configured. System-level setting,
   * read from the ROOT tenant like the other subscription settings.
   */
  static async getDefaultPlanId(): Promise<string | null> {
    try {
      const SettingService = (await import('@/modules/setting/setting.service')).default;
      const val = await SettingService.getValue(ROOT_TENANT_ID, 'defaultPlanId');
      return val && val.trim() ? val.trim() : null;
    } catch {
      return null;
    }
  }

  /**
   * Set (or clear, when `planId` is null) the default plan. Only a *free* plan
   * — a ROOT plan whose wrapped product has a base price of 0 — may be made the
   * default, so newly created tenants are never silently placed on a paid plan.
   */
  static async setDefaultPlanId(planId: string | null): Promise<void> {
    if (planId) {
      const plan = await TenantPlanService.getPlanById(ROOT_TENANT_ID, planId);
      if (!plan.product) {
        throw new AppError(SUBSCRIPTION_MESSAGES.DEFAULT_PLAN_DELETED_PRODUCT, 422, ErrorCode.VALIDATION_ERROR);
      }
      if (plan.product.basePrice !== 0) {
        throw new AppError(SUBSCRIPTION_MESSAGES.DEFAULT_PLAN_NOT_FREE, 422, ErrorCode.VALIDATION_ERROR);
      }
    }
    const SettingService = (await import('@/modules/setting/setting.service')).default;
    await SettingService.updateMany(ROOT_TENANT_ID, { defaultPlanId: planId ?? '' });
  }

  private static async getFeatureCache(tenantId: string): Promise<{
    status: string;
    gracePeriodEndsAt: string | null;
    features: Array<{ key: string; type: string; value: string }>;
  } | null> {
    try {
      const raw = await redis.get(this.featureCacheKey(tenantId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private static async setFeatureCache(
    tenantId: string,
    status: string,
    gracePeriodEndsAt: Date | null | undefined,
    features: Array<{ key: string; type: string; value: string }>,
  ): Promise<void> {
    try {
      await redis.set(
        this.featureCacheKey(tenantId),
        JSON.stringify({ status, gracePeriodEndsAt: gracePeriodEndsAt?.toISOString() ?? null, features }),
        'EX',
        this.FEATURE_CACHE_TTL,
      );
    } catch (err) {
      Logger.warn(`Feature cache set failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  static async invalidateFeatureCache(tenantId: string): Promise<void> {
    try {
      await redis.del(this.featureCacheKey(tenantId));
    } catch (err) {
      Logger.warn(`Feature cache invalidation failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private static logFeatureAccess(tenantId: string, result: FeatureAccessResult): void {
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

  static async checkFeatureAccess(
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
      let cached = await this.getFeatureCache(tenantId);

      if (!cached) {
        const ds = await tenantDataSourceFor(tenantId);
        const sub = await ds.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId } });

        if (!sub) {
          this.logFeatureAccess(tenantId, DENIED_BOOLEAN);
          return DENIED_BOOLEAN;
        }

        const features = await ds.getRepository(PlanFeatureEntity).find({
          where: { tenantId, planId: sub.planId },
          select: ['key', 'type', 'value'],
        });

        await this.setFeatureCache(tenantId, sub.status, sub.gracePeriodEndsAt ?? null, features);
        cached = { status: sub.status, gracePeriodEndsAt: sub.gracePeriodEndsAt?.toISOString() ?? null, features };
      }

      const isInGracePeriod =
        cached.status === 'PAST_DUE' &&
        cached.gracePeriodEndsAt !== null &&
        new Date(cached.gracePeriodEndsAt) > new Date();

      if (!ACTIVE_STATUSES.includes(cached.status) && !isInGracePeriod) {
        this.logFeatureAccess(tenantId, DENIED_BOOLEAN);
        return DENIED_BOOLEAN;
      }

      const feature = cached.features.find((f) => f.key === featureKey);
      if (!feature) {
        this.logFeatureAccess(tenantId, DENIED_BOOLEAN);
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

      this.logFeatureAccess(tenantId, result);
      return result;
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_CHECK_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_CHECK_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async assertFeatureAccess(
    tenantId: string,
    featureKey: string,
    currentCount?: number,
    options?: { gracePercent?: number },
  ): Promise<FeatureAccessResult> {
    const result = await this.checkFeatureAccess(tenantId, featureKey, currentCount, options);

    if (!result.allowed) {
      const message = result.type === 'LIMIT'
        ? SUBSCRIPTION_MESSAGES.FEATURE_LIMIT_REACHED
        : SUBSCRIPTION_MESSAGES.FEATURE_ACCESS_DENIED;
      throw new AppError(message, 403, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    return result;
  }
}
