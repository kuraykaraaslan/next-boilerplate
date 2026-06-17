import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { singleFlight } from '@kuraykaraaslan/redis';
import Logger from '@kuraykaraaslan/logger';
import { SubscriptionPlan as PlanEntity } from './entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from './entities/plan_feature.entity';
import { Subscription as SubscriptionEntity } from './entities/subscription.entity';
import {
  SubscriptionPlanSchema, SubscriptionSchema, SubscriptionWithPlanSchema,
  type Subscription, type SubscriptionWithPlan,
} from './payment_subscription.types';
import type { CreateSubscriptionDTO, GetSubscriptionsQuery } from './payment_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './payment_subscription.messages';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import ProrationService from './payment_subscription.proration.service';
import type { BillingCycle } from './payment_subscription.enums';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import PaymentSubscriptionPlanService from './payment_subscription.plan.service';
import { RedisIdempotencyService } from '@kuraykaraaslan/redis_idempotency';

export async function createSubscription(tenantId: string, data: CreateSubscriptionDTO): Promise<Subscription> {
  // Avoid creating two subscriptions (and two billing schedules) on a retry.
  // Explicit key wins; otherwise dedupe on the provider's subscription id.
  const key = data.idempotencyKey
    ?? (data.providerSubscriptionId ? `sub:create:${data.providerSubscriptionId}` : undefined);
  return RedisIdempotencyService.run(tenantId, key, () => runCreateSubscription(tenantId, data));
}

async function runCreateSubscription(tenantId: string, data: CreateSubscriptionDTO): Promise<Subscription> {
  const ds = await tenantDataSourceFor(tenantId);
  const plan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId: data.planId } });
  if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  const product = await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, plan.productId);

  const cycle = (data.billingCycle ?? plan.interval) as BillingCycle;
  const amount = Number(product.basePrice);

  const periodStart = data.currentPeriodStart ?? new Date();
  const periodEnd = data.currentPeriodEnd ?? ProrationService.nextPeriodEnd(periodStart, cycle);
  const hasTrialDays = plan.trialDays > 0 && !data.trialEndsAt;
  const trialEndsAt = data.trialEndsAt ?? (hasTrialDays
    ? (() => { const d = new Date(); d.setDate(d.getDate() + plan.trialDays); return d; })()
    : undefined);

  try {
    const repo = ds.getRepository(SubscriptionEntity);
    const sub = repo.create({
      tenantId,
      userId: data.userId,
      planId: data.planId,
      provider: data.provider,
      providerSubscriptionId: data.providerSubscriptionId,
      providerCustomerId: data.providerCustomerId,
      status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
      billingCycle: cycle,
      amount,
      currency: data.currency ?? product.currency,
      trialEndsAt,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      metadata: data.metadata,
    });
    const saved = await repo.save(sub);
    await WebhookService.dispatchEvent(tenantId, 'subscription.created', {
      subscriptionId: saved.subscriptionId,
      userId: saved.userId,
      planId: saved.planId,
      status: saved.status,
      provider: saved.provider,
    });
    return SubscriptionSchema.parse(saved);
  } catch (error) {
    Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CREATE_FAILED}: ${error}`);
    throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
  }
}

export async function getSubscription(tenantId: string, subscriptionId: string, withPlan = false): Promise<Subscription | SubscriptionWithPlan> {
  return singleFlight(`sub:id:${subscriptionId}:${withPlan}`, async () => {
    const ds = await tenantDataSourceFor(tenantId);
    const sub = await ds.getRepository(SubscriptionEntity).findOne({ where: { tenantId, subscriptionId } });
    if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (!withPlan) return SubscriptionSchema.parse(sub);
    const plan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId: sub.planId } });
    if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const product = await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, plan.productId);
    const features = await ds.getRepository(PlanFeatureEntity).find({
      where: { tenantId, planId: sub.planId }, order: { sortOrder: 'ASC' },
    });
    return SubscriptionWithPlanSchema.parse({
      ...sub,
      plan: {
        ...SubscriptionPlanSchema.parse(plan),
        product: PaymentSubscriptionPlanService.productSummary(product),
        features,
      },
    });
  });
}

export async function listSubscriptions(
  tenantId: string,
  query: GetSubscriptionsQuery,
): Promise<{ data: Subscription[]; total: number }> {
  const ds = await tenantDataSourceFor(tenantId);
  const where: Record<string, unknown> = { tenantId };
  if (query.userId) where['userId'] = query.userId;
  if (query.planId) where['planId'] = query.planId;
  if (query.status) where['status'] = query.status;
  if (query.provider) where['provider'] = query.provider;
  const [rows, total] = await ds.getRepository(SubscriptionEntity).findAndCount({
    where, order: { createdAt: 'DESC' },
    skip: query.page * query.pageSize, take: query.pageSize,
  });
  return { data: rows.map((r) => SubscriptionSchema.parse(r)), total };
}
