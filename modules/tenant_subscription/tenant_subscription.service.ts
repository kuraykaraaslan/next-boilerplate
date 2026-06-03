import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../payment/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '../payment/entities/plan_feature.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import Logger from '@/modules/logger';
import PaymentService from '@/modules/payment/payment.service';
import {
  TenantSubscriptionSchema,
  TenantSubscriptionWithPlanSchema,
  GracePeriodStatusSchema,
} from './tenant_subscription.types';
import type {
  TenantSubscription,
  TenantSubscriptionWithPlan,
  GracePeriodStatus,
} from './tenant_subscription.types';
import type {
  AssignSubscriptionDTO,
} from './tenant_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { emitWebhook } from './tenant_subscription.helpers';
import TenantFeatureGateService from './tenant_subscription.feature.service';

/**
 * Core tenant-subscription lifecycle: assigning/cancelling plans, grace-period
 * management, and payment confirmation. Plan/feature CRUD lives in
 * `TenantPlanService`, checkout flows in `TenantCheckoutService` /
 * `TenantCardCheckoutService`, root-admin platform-plan cloning in
 * `TenantPlatformPlanService`, and feature gating in
 * {@link TenantFeatureGateService}.
 */
export default class TenantSubscriptionService {

  // ============================================================================
  // Tenant Subscription Operations
  // ============================================================================

  static async assignPlan(tenantId: string, data: AssignSubscriptionDTO): Promise<TenantSubscription> {
    const sysDs = await tenantDataSourceFor(tenantId);
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId: data.planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);

    const interval = (data.billingInterval ?? plan.interval) as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

    const now = new Date();
    const periodEnd = new Date(now);
    switch (interval) {
      case 'DAILY':     periodEnd.setDate(periodEnd.getDate() + 1); break;
      case 'WEEKLY':    periodEnd.setDate(periodEnd.getDate() + 7); break;
      case 'MONTHLY':   periodEnd.setMonth(periodEnd.getMonth() + 1); break;
      case 'QUARTERLY': periodEnd.setMonth(periodEnd.getMonth() + 3); break;
      case 'YEARLY':    periodEnd.setFullYear(periodEnd.getFullYear() + 1); break;
    }

    const trialEndsAt = plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;

    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(TenantSubscriptionEntity);
      const existing = await repo.findOne({ where: { tenantId } });

      let saved: TenantSubscriptionEntity;
      if (existing) {
        await repo.update({ tenantId }, {
          planId: data.planId,
          billingInterval: interval,
          status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: trialEndsAt ?? undefined,
          cancelledAt: undefined,
        } as any);
        saved = (await repo.findOne({ where: { tenantId } }))!;
      } else {
        const entity = repo.create({
          tenantId,
          planId: data.planId,
          billingInterval: interval,
          status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: trialEndsAt ?? undefined,
        });
        saved = await repo.save(entity);
      }

      await TenantFeatureGateService.invalidateFeatureCache(tenantId);
      // Platform-level fact: the operator assigned a plan to a tenant. Routed to
      // root-tenant webhooks (ROOT_TENANT_ID == the platform's own dispatch).
      await emitWebhook(ROOT_TENANT_ID, 'subscription.assigned', {
        tenantId,
        planId: data.planId,
        status: saved.status,
        billingInterval: interval,
      });
      return TenantSubscriptionSchema.parse(saved);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED);
    }
  }

  static async getSubscription(tenantId: string): Promise<TenantSubscriptionWithPlan | null> {
    const ds = await tenantDataSourceFor(tenantId);
    const subscription = await ds.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId } });
    if (!subscription) return null;

    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId: subscription.planId } });
    if (!plan) return null;

    const features = await ds.getRepository(PlanFeatureEntity).find({ where: { tenantId, planId: plan.planId }, order: { sortOrder: 'ASC' } });
    return TenantSubscriptionWithPlanSchema.parse({ ...subscription, plan: { ...plan, features } });
  }

  static async cancelSubscription(tenantId: string): Promise<TenantSubscription> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSubscriptionEntity);
    const existing = await repo.findOne({ where: { tenantId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND);
    if (existing.status === 'CANCELLED') throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ALREADY_CANCELLED);

    try {
      await repo.update({ tenantId }, { status: 'CANCELLED', cancelledAt: new Date() });
      const updated = await repo.findOne({ where: { tenantId } });
      await TenantFeatureGateService.invalidateFeatureCache(tenantId);
      return TenantSubscriptionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED);
    }
  }

  // ============================================================================
  // Grace Period Management
  // ============================================================================

  private static readonly GRACE_PERIOD_DAYS_DEFAULT = 7;

  private static async getGracePeriodDays(): Promise<number> {
    try {
      const SettingService = (await import('@/modules/setting/setting.service')).default;
      const val = await SettingService.getValue(ROOT_TENANT_ID, 'subscriptionGracePeriodDays');
      const parsed = val ? parseInt(val, 10) : NaN;
      return isNaN(parsed) || parsed < 0 ? this.GRACE_PERIOD_DAYS_DEFAULT : parsed;
    } catch {
      return this.GRACE_PERIOD_DAYS_DEFAULT;
    }
  }

  static async startGracePeriod(tenantId: string): Promise<TenantSubscription> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSubscriptionEntity);
    const existing = await repo.findOne({ where: { tenantId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND);
    if (existing.status !== 'PAST_DUE') throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_PAST_DUE);

    const gracePeriodDays = await this.getGracePeriodDays();
    const gracePeriodEndsAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);

    try {
      await repo.update({ tenantId }, { gracePeriodEndsAt } as any);
      const updated = await repo.findOne({ where: { tenantId } });
      await TenantFeatureGateService.invalidateFeatureCache(tenantId);
      Logger.info(`Grace period started for tenant ${tenantId} — ends ${gracePeriodEndsAt.toISOString()}`);
      return TenantSubscriptionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.GRACE_PERIOD_START_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.GRACE_PERIOD_START_FAILED);
    }
  }

  static async getGracePeriodStatus(tenantId: string): Promise<GracePeriodStatus> {
    const ds = await tenantDataSourceFor(tenantId);
    const sub = await ds.getRepository(TenantSubscriptionEntity).findOne({ where: { tenantId } });

    if (!sub || sub.status !== 'PAST_DUE' || !sub.gracePeriodEndsAt) {
      return GracePeriodStatusSchema.parse({ inGrace: false, gracePeriodEndsAt: null, daysRemaining: null });
    }

    const now = new Date();
    const endsAt = new Date(sub.gracePeriodEndsAt);
    const inGrace = endsAt > now;
    const daysRemaining = inGrace
      ? Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    return GracePeriodStatusSchema.parse({ inGrace, gracePeriodEndsAt: endsAt, daysRemaining });
  }

  static async expireOverdueSubscriptions(): Promise<number> {
    try {
      const ds = await getDataSource();
      const repo = ds.getRepository(TenantSubscriptionEntity);
      const now = new Date();

      const overdue = await repo
        .createQueryBuilder('sub')
        .where('sub.status = :status', { status: 'PAST_DUE' })
        .andWhere('sub.gracePeriodEndsAt IS NOT NULL')
        .andWhere('sub.gracePeriodEndsAt <= :now', { now })
        .getMany();

      for (const sub of overdue) {
        await repo.update({ tenantId: sub.tenantId }, { status: 'EXPIRED' } as any);
        await TenantFeatureGateService.invalidateFeatureCache(sub.tenantId);
        Logger.info(`Subscription expired for tenant ${sub.tenantId} — grace period ended`);
      }

      return overdue.length;
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_EXPIRE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_EXPIRE_FAILED);
    }
  }

  // ============================================================================
  // Payment Confirmation — finalize a paid checkout into an active subscription
  // ============================================================================

  static async confirmPayment(paymentId: string): Promise<TenantSubscription> {
    try {
      const payment = await PaymentService.getById(paymentId);

      if (!payment) {
        throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_NOT_FOUND);
      }

      if (payment.status === 'COMPLETED') {
        const existing = await this.getSubscription(payment.tenantId!);
        if (existing) {
          return TenantSubscriptionSchema.parse({
            subscriptionId: existing.subscriptionId,
            tenantId: existing.tenantId,
            planId: existing.planId,
            status: existing.status,
            billingInterval: existing.billingInterval,
            currentPeriodStart: existing.currentPeriodStart,
            currentPeriodEnd: existing.currentPeriodEnd,
            trialEndsAt: existing.trialEndsAt,
            cancelledAt: existing.cancelledAt,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
          });
        }
        throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_ALREADY_PROCESSED);
      }

      if (payment.status !== 'PENDING' && payment.status !== 'PROCESSING') {
        throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_INVALID_STATUS);
      }

      const metadata = payment.metadata as { planId?: string; billingInterval?: string; tenantId?: string } || {};
      const { planId, billingInterval, tenantId } = metadata;

      if (!planId || !tenantId) {
        throw new Error(SUBSCRIPTION_MESSAGES.INVALID_REQUEST);
      }

      await PaymentService.markAsCompleted(paymentId);

      return await this.assignPlan(tenantId, {
        planId,
        billingInterval: billingInterval as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | undefined,
      });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PAYMENT_CONFIRMATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
