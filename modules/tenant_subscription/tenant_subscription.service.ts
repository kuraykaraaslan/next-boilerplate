import 'reflect-metadata';
import { Not } from 'typeorm';
import { getSystemDataSource, getDefaultTenantDataSource, tenantDataSourceFor } from '@/modules/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../payment/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '../payment/entities/plan_feature.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import Logger from '@/modules/logger';
import redis from '@/modules/redis';
import PaymentService from '@/modules/payment/payment.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import type { PaymentProvider, PaymentCurrency } from '@/modules/payment/payment.enums';
import {
  SubscriptionPlanSchema,
  PlanWithFeaturesSchema,
  PlanFeatureSchema,
  TenantSubscriptionSchema,
  TenantSubscriptionWithPlanSchema,
  GracePeriodStatusSchema,
} from './tenant_subscription.types';
import type {
  SubscriptionPlan,
  PlanWithFeatures,
  PlanFeature,
  TenantSubscription,
  TenantSubscriptionWithPlan,
  FeatureAccessResult,
  GracePeriodStatus,
} from './tenant_subscription.types';
import type {
  CreatePlanDTO,
  UpdatePlanDTO,
  CreateFeatureDTO,
  UpdateFeatureDTO,
  AssignSubscriptionDTO,
} from './tenant_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import type { SubscriptionPlanStatus } from './tenant_subscription.enums';

export default class TenantSubscriptionService {

  // ============================================================================
  // Plan CRUD Operations
  // ============================================================================

  static async createPlan(data: CreatePlanDTO): Promise<SubscriptionPlan> {
    try {
      const ds = await getSystemDataSource();
      const repo = ds.getRepository(SubscriptionPlanEntity);

      if (data.isDefault) {
        await repo.update({ isDefault: true }, { isDefault: false });
      }

      const plan = repo.create({
        name: data.name,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        currency: data.currency,
        trialDays: data.trialDays,
        sortOrder: data.sortOrder,
        isDefault: data.isDefault,
        status: data.status,
      });
      const saved = await repo.save(plan);
      return SubscriptionPlanSchema.parse(saved);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED);
    }
  }

  static async updatePlan(planId: string, data: UpdatePlanDTO): Promise<SubscriptionPlan> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(SubscriptionPlanEntity);
    const existing = await repo.findOne({ where: { planId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);

    try {
      if (data.isDefault) {
        await repo.update({ isDefault: true, planId: Not(planId) }, { isDefault: false });
      }

      await repo.update({ planId }, {
        name: data.name,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        currency: data.currency,
        trialDays: data.trialDays,
        sortOrder: data.sortOrder,
        isDefault: data.isDefault,
        status: data.status,
      } as any);

      const updated = await repo.findOne({ where: { planId } });
      return SubscriptionPlanSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED);
    }
  }

  static async deletePlan(planId: string): Promise<void> {
    const sysDs = await getSystemDataSource();
    const existing = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { planId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);

    const tenantDs = await getDefaultTenantDataSource();
    const activeCount = await tenantDs.getRepository(TenantSubscriptionEntity).count({
      where: { planId, status: 'ACTIVE' },
    });
    if (activeCount > 0) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_HAS_SUBSCRIPTIONS);

    try {
      await sysDs.getRepository(SubscriptionPlanEntity).delete({ planId });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED);
    }
  }

  static async getPlans(status?: SubscriptionPlanStatus): Promise<SubscriptionPlan[]> {
    const ds = await getSystemDataSource();
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const plans = await ds.getRepository(SubscriptionPlanEntity).find({ where: where as any, order: { sortOrder: 'ASC' } });
    return plans.map((p) => SubscriptionPlanSchema.parse(p));
  }

  static async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const ds = await getSystemDataSource();
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    return SubscriptionPlanSchema.parse(plan);
  }

  static async getPlanWithFeatures(planId: string): Promise<PlanWithFeatures> {
    const ds = await getSystemDataSource();
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const features = await ds.getRepository(PlanFeatureEntity).find({ where: { planId }, order: { sortOrder: 'ASC' } });
    return PlanWithFeaturesSchema.parse({ ...plan, features });
  }

  static async getPlansWithFeatures(status?: SubscriptionPlanStatus): Promise<PlanWithFeatures[]> {
    const ds = await getSystemDataSource();
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    const plans = await ds.getRepository(SubscriptionPlanEntity).find({ where: where as any, order: { sortOrder: 'ASC' } });
    const planIds = plans.map((p) => p.planId);
    const allFeatures = planIds.length > 0
      ? await ds.getRepository(PlanFeatureEntity).find({ where: planIds.map((id) => ({ planId: id })), order: { sortOrder: 'ASC' } })
      : [];

    return plans.map((plan) =>
      PlanWithFeaturesSchema.parse({ ...plan, features: allFeatures.filter((f) => f.planId === plan.planId) })
    );
  }

  // ============================================================================
  // Feature CRUD Operations
  // ============================================================================

  static async addFeature(planId: string, data: CreateFeatureDTO): Promise<PlanFeature> {
    const ds = await getSystemDataSource();
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);

    try {
      const repo = ds.getRepository(PlanFeatureEntity);
      const feature = repo.create({
        planId,
        key: data.key,
        label: data.label,
        type: data.type,
        value: data.value,
        sortOrder: data.sortOrder,
      });
      const saved = await repo.save(feature);
      return PlanFeatureSchema.parse(saved);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === '23505') {
        throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS);
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED);
    }
  }

  static async updateFeature(featureId: string, data: UpdateFeatureDTO): Promise<PlanFeature> {
    const ds = await getSystemDataSource();
    const repo = ds.getRepository(PlanFeatureEntity);
    const existing = await repo.findOne({ where: { featureId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND);

    try {
      await repo.update({ featureId }, {
        key: data.key,
        label: data.label,
        type: data.type,
        value: data.value,
        sortOrder: data.sortOrder,
      } as any);
      const updated = await repo.findOne({ where: { featureId } });
      return PlanFeatureSchema.parse(updated!);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === '23505') {
        throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS);
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED);
    }
  }

  static async removeFeature(featureId: string): Promise<void> {
    const ds = await getSystemDataSource();
    const existing = await ds.getRepository(PlanFeatureEntity).findOne({ where: { featureId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND);

    try {
      await ds.getRepository(PlanFeatureEntity).delete({ featureId });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED);
    }
  }

  static async getFeaturesByPlan(planId: string): Promise<PlanFeature[]> {
    const ds = await getSystemDataSource();
    const features = await ds.getRepository(PlanFeatureEntity).find({ where: { planId }, order: { sortOrder: 'ASC' } });
    return features.map((f) => PlanFeatureSchema.parse(f));
  }

  // ============================================================================
  // Tenant Subscription Operations
  // ============================================================================

  static async assignPlan(tenantId: string, data: AssignSubscriptionDTO): Promise<TenantSubscription> {
    const sysDs = await getSystemDataSource();
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { planId: data.planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);

    const now = new Date();
    const periodEnd = new Date(now);
    if (data.billingInterval === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
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
          billingInterval: data.billingInterval,
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
          billingInterval: data.billingInterval,
          status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: trialEndsAt ?? undefined,
        });
        saved = await repo.save(entity);
      }

      await this.invalidateFeatureCache(tenantId);
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

    const sysDs = await getSystemDataSource();
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { planId: subscription.planId } });
    if (!plan) return null;

    const features = await sysDs.getRepository(PlanFeatureEntity).find({ where: { planId: plan.planId }, order: { sortOrder: 'ASC' } });
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
      await this.invalidateFeatureCache(tenantId);
      return TenantSubscriptionSchema.parse(updated!);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED);
    }
  }

  // ============================================================================
  // Grace Period Management
  // ============================================================================

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
      await this.invalidateFeatureCache(tenantId);
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
      const ds = await getDefaultTenantDataSource();
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
        await this.invalidateFeatureCache(sub.tenantId);
        Logger.info(`Subscription expired for tenant ${sub.tenantId} — grace period ended`);
      }

      return overdue.length;
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_EXPIRE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_EXPIRE_FAILED);
    }
  }

  // ============================================================================
  // Payment Integration
  // ============================================================================

  static async purchaseSubscription(params: {
    tenantId: string;
    planId: string;
    billingInterval: 'MONTHLY' | 'YEARLY';
    successUrl: string;
    cancelUrl: string;
    provider?: PaymentProvider;
    customerEmail?: string;
    customerName?: string;
  }): Promise<{ paymentId: string; checkoutUrl: string }> {
    const { tenantId, planId, billingInterval, successUrl, cancelUrl, provider, customerEmail, customerName } = params;

    const sysDs = await getSystemDataSource();
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);

    const amount = billingInterval === 'MONTHLY' ? Number(plan.monthlyPrice) : Number(plan.yearlyPrice);
    const currency = plan.currency as PaymentCurrency;

    try {
      const payment = await PaymentService.create({
        tenantId,
        provider: provider || 'STRIPE',
        amount,
        currency,
        description: `${plan.name} Subscription - ${billingInterval === 'MONTHLY' ? 'Monthly' : 'Yearly'}`,
        customerEmail,
        customerName,
        metadata: { type: 'subscription', planId, billingInterval, tenantId },
      });

      const checkout = await PaymentService.createCheckoutSession(
        {
          amount,
          currency,
          description: `${plan.name} Subscription`,
          successUrl: `${successUrl}?paymentId=${payment.paymentId}`,
          cancelUrl,
          metadata: { paymentId: payment.paymentId, planId, tenantId, billingInterval },
        },
        provider
      );

      await PaymentService.update(payment.paymentId, {
        providerPaymentId: checkout.sessionId,
        metadata: { ...(payment.metadata as object || {}), checkoutSessionId: checkout.sessionId },
      });

      return { paymentId: payment.paymentId, checkoutUrl: checkout.checkoutUrl };
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED);
    }
  }

  // ============================================================================
  // Feature Gating — Redis cache + AuditLog
  // ============================================================================

  private static readonly FEATURE_CACHE_PREFIX = 'feature:sub:';
  private static readonly FEATURE_CACHE_TTL = 300;

  private static featureCacheKey(tenantId: string): string {
    return `${this.FEATURE_CACHE_PREFIX}${tenantId}`;
  }

  private static readonly GRACE_PERIOD_DAYS_DEFAULT = 7;

  private static async getGracePeriodDays(): Promise<number> {
    try {
      const SettingService = (await import('@/modules/setting/setting.service')).default;
      const val = await SettingService.getValue('subscriptionGracePeriodDays');
      const parsed = val ? parseInt(val, 10) : NaN;
      return isNaN(parsed) || parsed < 0 ? this.GRACE_PERIOD_DAYS_DEFAULT : parsed;
    } catch {
      return this.GRACE_PERIOD_DAYS_DEFAULT;
    }
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

        const sysDs = await getSystemDataSource();
        const features = await sysDs.getRepository(PlanFeatureEntity).find({
          where: { planId: sub.planId },
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
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_CHECK_FAILED);
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
      throw new Error(message);
    }

    return result;
  }

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

      if (!planId || !billingInterval || !tenantId) {
        throw new Error(SUBSCRIPTION_MESSAGES.INVALID_REQUEST);
      }

      await PaymentService.markAsCompleted(paymentId);

      return await this.assignPlan(tenantId, {
        planId,
        billingInterval: billingInterval as 'MONTHLY' | 'YEARLY',
      });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PAYMENT_CONFIRMATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
