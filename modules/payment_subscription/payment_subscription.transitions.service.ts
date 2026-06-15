import 'reflect-metadata';
import type { CurrencyCode } from '@/modules/common';
import { tenantDataSourceFor } from '@/modules/db';
import redis from '@/modules/redis';
import { SubscriptionPlan as PlanEntity } from './entities/subscription_plan.entity';
import { Subscription as SubscriptionEntity } from './entities/subscription.entity';
import {
  SubscriptionSchema,
  type Subscription, type ProrationPreview,
} from './payment_subscription.types';
import type {
  CancelSubscriptionDTO, PauseSubscriptionDTO, ChangePlanDTO,
} from './payment_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './payment_subscription.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import ProrationService from './payment_subscription.proration.service';
import type { BillingCycle } from './payment_subscription.enums';
import WebhookService from '@/modules/webhook/webhook.service';
import PaymentSubscriptionPlanService from './payment_subscription.plan.service';

async function bustCache(subscriptionId: string): Promise<void> {
  await redis.del(`sub:id:${subscriptionId}:true`);
  await redis.del(`sub:id:${subscriptionId}:false`);
}

export async function cancelSubscription(tenantId: string, subscriptionId: string, dto: CancelSubscriptionDTO): Promise<Subscription> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SubscriptionEntity);
  const sub = await repo.findOne({ where: { tenantId, subscriptionId } });
  if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (sub.status === 'CANCELLED') throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ALREADY_CANCELLED, 409, ErrorCode.CONFLICT);

  sub.cancelAtPeriodEnd = dto.cancelAtPeriodEnd;
  sub.cancellationReason = dto.reason ?? undefined;
  if (!dto.cancelAtPeriodEnd) {
    sub.status = 'CANCELLED';
    sub.cancelledAt = new Date();
  }
  const saved = await repo.save(sub);
  await bustCache(subscriptionId);
  await WebhookService.dispatchEvent(tenantId, 'subscription.cancelled', {
    subscriptionId: saved.subscriptionId,
    userId: saved.userId,
    planId: saved.planId,
    status: saved.status,
    cancelAtPeriodEnd: saved.cancelAtPeriodEnd,
  });
  return SubscriptionSchema.parse(saved);
}

export async function pauseSubscription(tenantId: string, subscriptionId: string, dto: PauseSubscriptionDTO): Promise<Subscription> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SubscriptionEntity);
  const sub = await repo.findOne({ where: { tenantId, subscriptionId } });
  if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (!['ACTIVE', 'TRIALING'].includes(sub.status)) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_ACTIVE, 409, ErrorCode.CONFLICT);

  sub.status = 'PAUSED';
  sub.pausedAt = new Date();
  sub.pausedUntil = dto.pausedUntil ?? undefined;
  const saved = await repo.save(sub);
  await bustCache(subscriptionId);
  await WebhookService.dispatchEvent(tenantId, 'subscription.paused', {
    subscriptionId: saved.subscriptionId,
    userId: saved.userId,
    planId: saved.planId,
    status: saved.status,
  });
  return SubscriptionSchema.parse(saved);
}

export async function resumeSubscription(tenantId: string, subscriptionId: string): Promise<Subscription> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SubscriptionEntity);
  const sub = await repo.findOne({ where: { tenantId, subscriptionId } });
  if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (sub.status !== 'PAUSED') throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_ACTIVE, 409, ErrorCode.CONFLICT);

  sub.status = 'ACTIVE';
  sub.pausedAt = undefined;
  sub.pausedUntil = undefined;
  const saved = await repo.save(sub);
  await bustCache(subscriptionId);
  await WebhookService.dispatchEvent(tenantId, 'subscription.resumed', {
    subscriptionId: saved.subscriptionId,
    userId: saved.userId,
    planId: saved.planId,
    status: saved.status,
  });
  return SubscriptionSchema.parse(saved);
}

export async function changePlan(tenantId: string, subscriptionId: string, dto: ChangePlanDTO): Promise<Subscription> {
  const ds = await tenantDataSourceFor(tenantId);
  const subRepo = ds.getRepository(SubscriptionEntity);
  const planRepo = ds.getRepository(PlanEntity);

  const sub = await subRepo.findOne({ where: { tenantId, subscriptionId } });
  if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const newPlan = await planRepo.findOne({ where: { tenantId, planId: dto.newPlanId } });
  if (!newPlan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const newProduct = await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, newPlan.productId);

  const cycle = (dto.billingCycle ?? newPlan.interval) as BillingCycle;
  sub.planId = dto.newPlanId;
  sub.billingCycle = cycle;
  sub.amount = Number(newProduct.basePrice);
  sub.currency = newProduct.currency;

  if (dto.prorate && sub.currentPeriodStart && sub.currentPeriodEnd) {
    const periodEnd = ProrationService.nextPeriodEnd(new Date(), cycle);
    sub.currentPeriodStart = new Date();
    sub.currentPeriodEnd = periodEnd;
  }

  const saved = await subRepo.save(sub);
  await bustCache(subscriptionId);
  await WebhookService.dispatchEvent(tenantId, 'subscription.updated', {
    subscriptionId: saved.subscriptionId,
    userId: saved.userId,
    planId: saved.planId,
    status: saved.status,
    billingCycle: saved.billingCycle,
  });
  return SubscriptionSchema.parse(saved);
}

/**
 * Called by payment webhook handlers when a renewal charge fails.
 * Transitions the subscription to PAST_DUE and increments pastDueCount
 * so external dunning logic can gate on the failure depth.
 * On the configurable grace-period boundary callers should follow up with
 * cancelSubscription({ cancelAtPeriodEnd: false }).
 */
export async function markPastDue(tenantId: string, subscriptionId: string): Promise<Subscription> {
  const ds = await tenantDataSourceFor(tenantId);
  const repo = ds.getRepository(SubscriptionEntity);
  const sub = await repo.findOne({ where: { tenantId, subscriptionId } });
  if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  if (['CANCELLED', 'EXPIRED'].includes(sub.status)) return SubscriptionSchema.parse(sub);

  sub.status = 'PAST_DUE';
  sub.pastDueCount = (sub.pastDueCount ?? 0) + 1;
  const saved = await repo.save(sub);
  await bustCache(subscriptionId);
  await WebhookService.dispatchEvent(tenantId, 'subscription.past_due', {
    subscriptionId: saved.subscriptionId,
    userId: saved.userId,
    planId: saved.planId,
    pastDueCount: saved.pastDueCount,
  });
  return SubscriptionSchema.parse(saved);
}

export async function prorationPreview(
  tenantId: string,
  subscriptionId: string,
  dto: ChangePlanDTO,
): Promise<ProrationPreview> {
  const ds = await tenantDataSourceFor(tenantId);
  const sub = await ds.getRepository(SubscriptionEntity).findOne({ where: { tenantId, subscriptionId } });
  if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const newPlan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId: dto.newPlanId } });
  if (!newPlan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const newProduct = await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, newPlan.productId);

  const cycle = (dto.billingCycle ?? newPlan.interval) as BillingCycle;
  const newAmount = Number(newProduct.basePrice);

  return ProrationService.preview(
    Number(sub.amount),
    newAmount,
    cycle,
    sub.currentPeriodStart ?? new Date(),
    sub.currentPeriodEnd ?? new Date(),
    sub.currency as CurrencyCode,
  );
}
