import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '@kuraykaraaslan/payment/server/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '@kuraykaraaslan/payment/server/entities/plan_feature.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import Logger from '@kuraykaraaslan/logger';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import {
  TenantSubscriptionSchema,
  TenantSubscriptionWithPlanSchema,
} from './tenant_subscription.types';
import type {
  TenantSubscription,
  TenantSubscriptionWithPlan,
} from './tenant_subscription.types';
import type { BillingInterval } from './tenant_subscription.enums';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import TenantFeatureGateService from './tenant_subscription.feature.service';

/**
 * Admin-facing document layer for the Tenant Subscription document.
 * Provides a list view, a detail (with plan + features) read, and the lifecycle
 * workflow transitions: ACTIVE -> GRACE (PAST_DUE) -> EXPIRED, plus -> CANCELLED
 * and a -> ACTIVE renew. Each transition asserts the source state, applies the
 * mutation, invalidates the feature cache and emits a webhook event.
 */
export default class TenantSubscriptionAdminService {

  private static periodEndFor(from: Date, interval: BillingInterval): Date {
    const end = new Date(from);
    switch (interval) {
      case 'DAILY':     end.setDate(end.getDate() + 1); break;
      case 'WEEKLY':    end.setDate(end.getDate() + 7); break;
      case 'MONTHLY':   end.setMonth(end.getMonth() + 1); break;
      case 'QUARTERLY': end.setMonth(end.getMonth() + 3); break;
      case 'YEARLY':    end.setFullYear(end.getFullYear() + 1); break;
    }
    return end;
  }

  /** List all subscription rows for the tenant. One row per tenant in practice. */
  static async list(tenantId: string): Promise<{ data: TenantSubscription[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const rows = await ds.getRepository(TenantSubscriptionEntity).find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    const data = rows.map((r) => TenantSubscriptionSchema.parse(r));
    return { data, total: data.length };
  }

  /** Detail read with the bound plan and its features embedded. */
  static async getById(tenantId: string, subscriptionId: string): Promise<TenantSubscriptionWithPlan> {
    const ds = await tenantDataSourceFor(tenantId);
    const sub = await ds.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId, subscriptionId } });
    if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId: sub.planId } });
    if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const features = await ds.getRepository(PlanFeatureEntity).find({
      where: { tenantId, planId: plan.planId },
      order: { sortOrder: 'ASC' },
    });
    return TenantSubscriptionWithPlanSchema.parse({ ...sub, plan: { ...plan, features } });
  }

  private static async loadRow(tenantId: string, subscriptionId: string): Promise<TenantSubscriptionEntity> {
    const ds = await tenantDataSourceFor(tenantId);
    const sub = await ds.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId, subscriptionId } });
    if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return sub;
  }

  private static async apply(
    tenantId: string,
    subscriptionId: string,
    patch: Partial<TenantSubscriptionEntity>,
    event: string,
    failMessage: string,
  ): Promise<TenantSubscription> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(TenantSubscriptionEntity);
      await repo.update({ tenantId, subscriptionId }, patch as any);
      const updated = await repo.findOne({ where: { tenantId, subscriptionId } });
      await TenantFeatureGateService.invalidateFeatureCache(tenantId);
      await WebhookService.dispatchEvent(tenantId, event as Parameters<typeof WebhookService.dispatchEvent>[1], {
        tenantId, subscriptionId, planId: updated?.planId ?? null, status: updated?.status ?? null,
      }).catch(() => {});
      Logger.info(`[tenant_subscription] ${event} for tenant ${tenantId} sub ${subscriptionId}`);
      return TenantSubscriptionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${failMessage}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(failMessage, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  /** ACTIVE/TRIALING -> PAST_DUE (grace). Starts the grace window. */
  static async startGrace(tenantId: string, subscriptionId: string): Promise<TenantSubscription> {
    const sub = await TenantSubscriptionAdminService.loadRow(tenantId, subscriptionId);
    if (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING') {
      throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_INVALID_TRANSITION, 409, ErrorCode.CONFLICT);
    }
    const days = await TenantSubscriptionAdminService.graceDays();
    const gracePeriodEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return TenantSubscriptionAdminService.apply(
      tenantId, subscriptionId,
      { status: 'PAST_DUE', gracePeriodEndsAt },
      'subscription.grace_started', SUBSCRIPTION_MESSAGES.GRACE_PERIOD_START_FAILED,
    );
  }

  /** PAST_DUE/ACTIVE -> EXPIRED. Hard-stops access. */
  static async expire(tenantId: string, subscriptionId: string): Promise<TenantSubscription> {
    const sub = await TenantSubscriptionAdminService.loadRow(tenantId, subscriptionId);
    if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
      throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_INVALID_TRANSITION, 409, ErrorCode.CONFLICT);
    }
    return TenantSubscriptionAdminService.apply(
      tenantId, subscriptionId,
      { status: 'EXPIRED' },
      'subscription.expired', SUBSCRIPTION_MESSAGES.SUBSCRIPTION_EXPIRE_FAILED,
    );
  }

  /** Any non-cancelled state -> CANCELLED. */
  static async cancel(tenantId: string, subscriptionId: string): Promise<TenantSubscription> {
    const sub = await TenantSubscriptionAdminService.loadRow(tenantId, subscriptionId);
    if (sub.status === 'CANCELLED') {
      throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ALREADY_CANCELLED, 409, ErrorCode.CONFLICT);
    }
    return TenantSubscriptionAdminService.apply(
      tenantId, subscriptionId,
      { status: 'CANCELLED', cancelledAt: new Date() },
      'subscription.cancelled', SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED,
    );
  }

  /** PAST_DUE/EXPIRED/CANCELLED -> ACTIVE. Extends the period by one interval. */
  static async renew(tenantId: string, subscriptionId: string): Promise<TenantSubscription> {
    const sub = await TenantSubscriptionAdminService.loadRow(tenantId, subscriptionId);
    if (sub.status === 'ACTIVE') {
      throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_INVALID_TRANSITION, 409, ErrorCode.CONFLICT);
    }
    const now = new Date();
    const interval = (sub.billingInterval ?? 'MONTHLY') as BillingInterval;
    return TenantSubscriptionAdminService.apply(
      tenantId, subscriptionId,
      {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: TenantSubscriptionAdminService.periodEndFor(now, interval),
        gracePeriodEndsAt: null as any,
        cancelledAt: null as any,
      },
      'subscription.renewed', SUBSCRIPTION_MESSAGES.SUBSCRIPTION_RENEW_FAILED,
    );
  }

  private static async graceDays(): Promise<number> {
    try {
      const SettingService = (await import('@kuraykaraaslan/setting/server/setting.service')).default;
      const val = await SettingService.getValue(ROOT_TENANT_ID, 'subscriptionGracePeriodDays');
      const parsed = val ? parseInt(val, 10) : NaN;
      return isNaN(parsed) || parsed < 0 ? 7 : parsed;
    } catch {
      return 7;
    }
  }
}
