import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../payment/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '../payment/entities/plan_feature.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { ROOT_TENANT_ID } from '@/modules/tenant/tenant.constants';
import Logger from '@/modules/logger';
import PaymentService from '@/modules/payment/payment.service';
import {
  TenantSubscriptionSchema,
  TenantSubscriptionWithPlanSchema,
} from './tenant_subscription.types';
import type {
  TenantSubscription,
  TenantSubscriptionWithPlan,
} from './tenant_subscription.types';
import type { AssignSubscriptionDTO } from './tenant_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { emitWebhook } from './tenant_subscription.helpers';
import TenantFeatureGateService from './tenant_subscription.feature.service';

export default class TenantSubscriptionLifecycleService {

  static async assignPlan(tenantId: string, data: AssignSubscriptionDTO): Promise<TenantSubscription> {
    const sysDs = await tenantDataSourceFor(tenantId);
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId: data.planId } });
    if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

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
      await emitWebhook(ROOT_TENANT_ID, 'subscription.assigned', {
        tenantId,
        planId: data.planId,
        status: saved.status,
        billingInterval: interval,
      });
      return TenantSubscriptionSchema.parse(saved);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED, 500, ErrorCode.INTERNAL_ERROR);
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
    if (!existing) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (existing.status === 'CANCELLED') throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ALREADY_CANCELLED, 409, ErrorCode.CONFLICT);

    try {
      await repo.update({ tenantId }, { status: 'CANCELLED', cancelledAt: new Date() });
      const updated = await repo.findOne({ where: { tenantId } });
      await TenantFeatureGateService.invalidateFeatureCache(tenantId);
      return TenantSubscriptionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async confirmPayment(paymentId: string): Promise<TenantSubscription> {
    try {
      const payment = await PaymentService.getById(paymentId);

      if (!payment) {
        throw new AppError(SUBSCRIPTION_MESSAGES.PAYMENT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      }

      if (payment.status === 'COMPLETED') {
        const existing = await TenantSubscriptionLifecycleService.getSubscription(payment.tenantId!);
        if (existing) {
          return TenantSubscriptionSchema.parse(existing);
        }
        throw new AppError(SUBSCRIPTION_MESSAGES.PAYMENT_ALREADY_PROCESSED, 409, ErrorCode.CONFLICT);
      }

      if (payment.status !== 'PENDING' && payment.status !== 'PROCESSING') {
        throw new AppError(SUBSCRIPTION_MESSAGES.PAYMENT_INVALID_STATUS, 422, ErrorCode.VALIDATION_ERROR);
      }

      const metadata = payment.metadata as { planId?: string; billingInterval?: string; tenantId?: string } || {};
      const { planId, billingInterval, tenantId } = metadata;

      if (!planId || !tenantId) {
        throw new AppError(SUBSCRIPTION_MESSAGES.INVALID_REQUEST, 422, ErrorCode.VALIDATION_ERROR);
      }

      await PaymentService.markAsCompleted(paymentId);

      return await TenantSubscriptionLifecycleService.assignPlan(tenantId, {
        planId,
        billingInterval: billingInterval as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | undefined,
      });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PAYMENT_CONFIRMATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
