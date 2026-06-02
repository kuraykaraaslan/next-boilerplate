import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../payment/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '../payment/entities/plan_feature.entity';
import { StoreProduct as ProductEntity } from '@/modules/store/entities/store_product.entity';
import { StoreCategory as CategoryEntity } from '@/modules/store/entities/store_category.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import { ROOT_TENANT_ID, isRootTenant } from '@/modules/tenant/tenant.constants';
import Logger from '@/modules/logger';
import redis from '@/modules/redis';
import PaymentService from '@/modules/payment/payment.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { ExchangeRateService } from '@/modules/exchange_rate';
import type { PaymentProvider, PaymentCurrency, CreditCardInput } from '@/modules/payment/payment.enums';
import type { CardBinInfo } from '@/modules/payment/payment.types';
import {
  SubscriptionPlanSchema,
  PlanWithFeaturesSchema,
  PlanWithProductSchema,
  PlanProductSummarySchema,
  PlanFeatureSchema,
  TenantSubscriptionSchema,
  TenantSubscriptionWithPlanSchema,
  GracePeriodStatusSchema,
} from './tenant_subscription.types';
import type {
  SubscriptionPlan,
  PlanWithFeatures,
  PlanWithProduct,
  PlanProductSummary,
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
  AssignPlatformPlanDTO,
} from './tenant_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import type { SubscriptionPlanStatus } from './tenant_subscription.enums';

export default class TenantSubscriptionService {

  // ============================================================================
  // Plan CRUD Operations
  // ============================================================================

  private static productSummary(p: ProductEntity): PlanProductSummary {
    return PlanProductSummarySchema.parse({
      productId: p.productId,
      name: p.name,
      slug: p.slug,
      currency: p.currency,
      basePrice: p.basePrice,
      shortDescription: p.shortDescription ?? null,
      status: p.status,
    });
  }

  private static async fetchProductOrThrow(tenantId: string, productId: string): Promise<ProductEntity> {
    const ds = await tenantDataSourceFor(tenantId);
    const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } });
    if (!product) throw new Error('Product not found for plan.');
    return product;
  }

  // Read-side counterpart to fetchProductOrThrow: a plan may reference a product
  // that has since been deleted. Listing/detail views must degrade to a null
  // product rather than 500, so they use this instead.
  private static async fetchProductOrNull(tenantId: string, productId: string): Promise<ProductEntity | null> {
    const ds = await tenantDataSourceFor(tenantId);
    return ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } });
  }

  static async createPlan(tenantId: string, data: CreatePlanDTO): Promise<PlanWithProduct> {
    try {
      const product = await TenantSubscriptionService.fetchProductOrThrow(tenantId, data.productId);
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(SubscriptionPlanEntity);

      const plan = repo.create({
        tenantId,
        productId: data.productId,
        interval: data.interval,
        trialDays: data.trialDays,
        status: data.status,
      });
      const saved = await repo.save(plan);
      return PlanWithProductSchema.parse({
        ...SubscriptionPlanSchema.parse(saved),
        product: TenantSubscriptionService.productSummary(product),
      });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error instanceof Error ? error : new Error(SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED);
    }
  }

  static async updatePlan(tenantId: string, planId: string, data: UpdatePlanDTO): Promise<PlanWithProduct> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SubscriptionPlanEntity);
    const existing = await repo.findOne({ where: { tenantId, planId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    if (data.productId && data.productId !== existing.productId) {
      await TenantSubscriptionService.fetchProductOrThrow(tenantId, data.productId);
    }

    try {
      await repo.update({ tenantId, planId }, {
        ...(data.productId !== undefined && { productId: data.productId }),
        ...(data.interval !== undefined && { interval: data.interval }),
        ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
        ...(data.status !== undefined && { status: data.status }),
      } as any);

      const updated = await repo.findOne({ where: { tenantId, planId } });
      if (!updated) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
      const product = await TenantSubscriptionService.fetchProductOrThrow(tenantId, updated.productId);
      return PlanWithProductSchema.parse({
        ...SubscriptionPlanSchema.parse(updated),
        product: TenantSubscriptionService.productSummary(product),
      });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error instanceof Error ? error : new Error(SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED);
    }
  }

  static async deletePlan(tenantId: string, planId: string): Promise<void> {
    const sysDs = await tenantDataSourceFor(tenantId);
    const existing = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);

    const tenantDs = await getDataSource();
    const activeCount = await tenantDs.getRepository(TenantSubscriptionEntity).count({
      where: { tenantId, planId, status: 'ACTIVE' },
    });
    if (activeCount > 0) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_HAS_SUBSCRIPTIONS);

    try {
      await sysDs.getRepository(SubscriptionPlanEntity).delete({ tenantId, planId });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED);
    }
  }

  private static async attachProducts(tenantId: string, plans: SubscriptionPlanEntity[]): Promise<Map<string, ProductEntity>> {
    if (plans.length === 0) return new Map();
    const productIds = Array.from(new Set(plans.map((p) => p.productId)));
    const ds = await tenantDataSourceFor(tenantId);
    const products = await ds.getRepository(ProductEntity)
      .findBy(productIds.map((productId) => ({ tenantId, productId })));
    return new Map(products.map((p) => [p.productId, p]));
  }

  static async getPlans(tenantId: string, status?: SubscriptionPlanStatus): Promise<PlanWithProduct[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    const plans = await ds.getRepository(SubscriptionPlanEntity).find({ where: where as any, order: { createdAt: 'ASC' } });
    const productMap = await TenantSubscriptionService.attachProducts(tenantId, plans);
    return plans.map((p) => {
      const product = productMap.get(p.productId);
      return PlanWithProductSchema.parse({
        ...SubscriptionPlanSchema.parse(p),
        product: product ? TenantSubscriptionService.productSummary(product) : null,
      });
    });
  }

  static async getPlanById(tenantId: string, planId: string): Promise<PlanWithProduct> {
    const ds = await tenantDataSourceFor(tenantId);
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await TenantSubscriptionService.fetchProductOrNull(tenantId, plan.productId);
    return PlanWithProductSchema.parse({
      ...SubscriptionPlanSchema.parse(plan),
      product: product ? TenantSubscriptionService.productSummary(product) : null,
    });
  }

  static async getPlanWithFeatures(tenantId: string, planId: string): Promise<PlanWithFeatures> {
    const ds = await tenantDataSourceFor(tenantId);
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await TenantSubscriptionService.fetchProductOrNull(tenantId, plan.productId);
    const features = await ds.getRepository(PlanFeatureEntity).find({ where: { tenantId, planId }, order: { sortOrder: 'ASC' } });
    return PlanWithFeaturesSchema.parse({
      ...SubscriptionPlanSchema.parse(plan),
      product: product ? TenantSubscriptionService.productSummary(product) : null,
      features,
    });
  }

  static async getPlansWithFeatures(tenantId: string, status?: SubscriptionPlanStatus): Promise<PlanWithFeatures[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    const plans = await ds.getRepository(SubscriptionPlanEntity).find({ where: where as any, order: { createdAt: 'ASC' } });
    const productMap = await TenantSubscriptionService.attachProducts(tenantId, plans);
    const planIds = plans.map((p) => p.planId);
    const allFeatures = planIds.length > 0
      ? await ds.getRepository(PlanFeatureEntity).find({ where: planIds.map((id) => ({ tenantId, planId: id })), order: { sortOrder: 'ASC' } })
      : [];

    return plans.map((plan) => {
      const product = productMap.get(plan.productId);
      return PlanWithFeaturesSchema.parse({
        ...SubscriptionPlanSchema.parse(plan),
        product: product ? TenantSubscriptionService.productSummary(product) : null,
        features: allFeatures.filter((f) => f.planId === plan.planId),
      });
    });
  }

  // ============================================================================
  // Feature CRUD Operations
  // ============================================================================

  static async addFeature(tenantId: string, planId: string, data: CreateFeatureDTO): Promise<PlanFeature> {
    const ds = await tenantDataSourceFor(tenantId);
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);

    try {
      const repo = ds.getRepository(PlanFeatureEntity);
      const feature = repo.create({
        tenantId,
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

  static async updateFeature(tenantId: string, featureId: string, data: UpdateFeatureDTO): Promise<PlanFeature> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PlanFeatureEntity);
    const existing = await repo.findOne({ where: { tenantId, featureId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND);

    try {
      await repo.update({ tenantId, featureId }, {
        key: data.key,
        label: data.label,
        type: data.type,
        value: data.value,
        sortOrder: data.sortOrder,
      } as any);
      const updated = await repo.findOne({ where: { tenantId, featureId } });
      return PlanFeatureSchema.parse(updated!);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === '23505') {
        throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS);
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED);
    }
  }

  static async removeFeature(tenantId: string, featureId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const existing = await ds.getRepository(PlanFeatureEntity).findOne({ where: { tenantId, featureId } });
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND);

    try {
      await ds.getRepository(PlanFeatureEntity).delete({ tenantId, featureId });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED);
    }
  }

  static async getFeaturesByPlan(tenantId: string, planId: string): Promise<PlanFeature[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const features = await ds.getRepository(PlanFeatureEntity).find({ where: { tenantId, planId }, order: { sortOrder: 'ASC' } });
    return features.map((f) => PlanFeatureSchema.parse(f));
  }

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

      await this.invalidateFeatureCache(tenantId);
      return TenantSubscriptionSchema.parse(saved);
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED);
    }
  }

  /**
   * Root-admin only: take a plan from the ROOT (Platform) catalogue, clone its
   * category/product/plan/feature chain into the target tenant, and assign it
   * for free (no payment). Idempotent — re-assigning the same source plan reuses
   * the cloned rows (updating price + features) instead of duplicating them.
   *
   * The assignment is always free because {@link assignPlan} bypasses payment;
   * `priceOverride` only sets the cloned product's `basePrice` (what the tenant
   * would pay on a future self-service renewal). Omit to copy the source price,
   * pass `0` for a free-forever plan.
   */
  static async assignPlatformPlan(targetTenantId: string, data: AssignPlatformPlanDTO): Promise<TenantSubscription> {
    if (isRootTenant(targetTenantId)) {
      throw new Error('Cannot assign a platform plan to the root tenant itself');
    }

    try {
      // 1. Load the source plan (+ product + features) from the ROOT catalogue.
      const source = await this.getPlanWithFeatures(ROOT_TENANT_ID, data.planId);
      if (!source.product) throw new Error('Source platform plan references a deleted product.');
      const sourceProduct = source.product;

      const ds = await tenantDataSourceFor(targetTenantId);

      // 2a. find-or-create a "Platform Plans" category in the target tenant.
      const catRepo = ds.getRepository(CategoryEntity);
      let category = await catRepo.findOne({ where: { tenantId: targetTenantId, slug: 'platform-plans' } });
      if (!category) {
        category = await catRepo.save(catRepo.create({
          tenantId: targetTenantId,
          name: 'Platform Plans',
          slug: 'platform-plans',
          description: 'Plans assigned by the platform administrator.',
          isActive: true,
        }));
      }

      // 2b. find-or-create the cloned product (keyed by source plan id via sku).
      const sku = `platform-plan:${source.planId}`;
      const basePrice = data.priceOverride ?? sourceProduct.basePrice;
      const prodRepo = ds.getRepository(ProductEntity);
      let product = await prodRepo.findOne({ where: { tenantId: targetTenantId, sku } });
      if (product) {
        await prodRepo.update({ tenantId: targetTenantId, productId: product.productId }, {
          name: sourceProduct.name,
          basePrice,
          currency: sourceProduct.currency,
          status: 'ACTIVE',
        } as any);
        product = (await prodRepo.findOne({ where: { tenantId: targetTenantId, productId: product.productId } }))!;
      } else {
        product = await prodRepo.save(prodRepo.create({
          tenantId: targetTenantId,
          categoryId: category.categoryId,
          name: sourceProduct.name,
          slug: `platform-${sourceProduct.slug}`,
          shortDescription: sourceProduct.shortDescription ?? undefined,
          basePrice,
          currency: sourceProduct.currency,
          sku,
          status: 'ACTIVE',
          isDigital: true,
          trackInventory: false,
        }));
      }

      // 2c. find-or-create the cloned plan bound to that product.
      const planRepo = ds.getRepository(SubscriptionPlanEntity);
      let plan = await planRepo.findOne({ where: { tenantId: targetTenantId, productId: product.productId } });
      if (plan) {
        await planRepo.update({ tenantId: targetTenantId, planId: plan.planId }, {
          interval: source.interval,
          trialDays: source.trialDays,
          status: 'ACTIVE',
        } as any);
        plan = (await planRepo.findOne({ where: { tenantId: targetTenantId, planId: plan.planId } }))!;
      } else {
        plan = await planRepo.save(planRepo.create({
          tenantId: targetTenantId,
          productId: product.productId,
          interval: source.interval,
          trialDays: source.trialDays,
          status: 'ACTIVE',
        }));
      }

      // 2d. mirror the source plan's features (replace any existing).
      const featRepo = ds.getRepository(PlanFeatureEntity);
      await featRepo.delete({ tenantId: targetTenantId, planId: plan.planId });
      if (source.features.length > 0) {
        await featRepo.save(source.features.map((f) => featRepo.create({
          tenantId: targetTenantId,
          planId: plan!.planId,
          key: f.key,
          label: f.label,
          type: f.type,
          value: f.value,
          sortOrder: f.sortOrder,
        })));
      }

      // 3. assign the cloned plan — payment is bypassed, so this is free.
      return await this.assignPlan(targetTenantId, {
        planId: plan.planId,
        billingInterval: data.billingInterval,
      });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_ASSIGN_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw error instanceof Error ? error : new Error(SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_ASSIGN_FAILED);
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
    successUrl: string;
    cancelUrl: string;
    provider?: PaymentProvider;
    customerEmail?: string;
    customerName?: string;
    /**
     * Convert the plan price to TRY (live TCMB rate) before charging. Used by the
     * iyzico hosted **wallet** path (MasterPass / BKM Express), since those are
     * Turkish wallets that settle in TRY.
     */
    convertToTry?: boolean;
  }): Promise<{ paymentId: string; checkoutUrl: string }> {
    const { tenantId, planId, successUrl, cancelUrl, provider, customerEmail, customerName, convertToTry } = params;

    const sysDs = await tenantDataSourceFor(tenantId);
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await TenantSubscriptionService.fetchProductOrThrow(tenantId, plan.productId);

    const billingInterval = plan.interval;
    const baseAmount = Number(product.basePrice);
    const baseCurrency = product.currency;

    let amount = baseAmount;
    let currency = baseCurrency as PaymentCurrency;
    let exchangeRate: number | null = null;
    if (convertToTry && baseCurrency.toUpperCase() !== 'TRY') {
      exchangeRate = await ExchangeRateService.getRate(baseCurrency, 'TRY');
      amount = Math.round((baseAmount * exchangeRate + Number.EPSILON) * 100) / 100;
      currency = 'TRY' as PaymentCurrency;
    }

    try {
      const payment = await PaymentService.create({
        tenantId,
        provider: provider || 'STRIPE',
        amount,
        currency,
        description: `${product.name} Subscription (${billingInterval.toLowerCase()})`,
        customerEmail,
        customerName,
        metadata: {
          type: 'subscription', planId, billingInterval, tenantId,
          originalAmount: baseAmount,
          originalCurrency: baseCurrency,
          exchangeRate,
          chargedAmountTRY: currency === 'TRY' ? amount : undefined,
        },
      });

      const checkout = await PaymentService.createCheckoutSession(
        tenantId,
        {
          amount,
          currency,
          description: `${product.name} Subscription`,
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
  // Direct card checkout (custom non-3DS form) — charge in TRY for Turkish cards
  // ============================================================================

  /** Providers that settle Turkish cards in TRY, so a TR card triggers conversion. */
  private static readonly TRY_SETTLE_PROVIDERS: ReadonlySet<PaymentProvider> = new Set<PaymentProvider>(['IYZICO']);

  /**
   * Work out what currency/amount a plan should actually be charged in for a
   * given card BIN + provider, without creating any payment. Shared by `quote`
   * (live checkout preview) and `payWithCard` (the real charge), so both stay in
   * lockstep. A plan priced in USD is converted to TRY at the live TCMB rate when
   * a TRY-settling provider (iyzico) is paid with a Turkish card.
   */
  private static async resolveCharge(
    tenantId: string,
    planId: string,
    bin: string | undefined,
    provider: PaymentProvider,
  ): Promise<{
    plan: SubscriptionPlanEntity;
    product: ProductEntity;
    baseAmount: number;
    baseCurrency: string;
    binInfo: CardBinInfo | null;
    isTurkish: boolean;
    chargedAmount: number;
    chargedCurrency: string;
    exchangeRate: number | null;
  }> {
    const sysDs = await tenantDataSourceFor(tenantId);
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await TenantSubscriptionService.fetchProductOrThrow(tenantId, plan.productId);

    const baseAmount = Number(product.basePrice);
    const baseCurrency = product.currency;

    let binInfo: CardBinInfo | null = null;
    if (bin && bin.replace(/\D/g, '').length >= 6) {
      binInfo = await PaymentService.checkBin(tenantId, bin, provider);
    }

    const wantsTry =
      TenantSubscriptionService.TRY_SETTLE_PROVIDERS.has(provider) &&
      !!binInfo?.isTurkish &&
      baseCurrency.toUpperCase() !== 'TRY';

    if (wantsTry) {
      const rate = await ExchangeRateService.getRate(baseCurrency, 'TRY');
      const chargedAmount = Math.round((baseAmount * rate + Number.EPSILON) * 100) / 100;
      return {
        plan, product, baseAmount, baseCurrency, binInfo,
        isTurkish: true, chargedAmount, chargedCurrency: 'TRY', exchangeRate: rate,
      };
    }

    return {
      plan, product, baseAmount, baseCurrency, binInfo,
      isTurkish: !!binInfo?.isTurkish,
      chargedAmount: baseAmount, chargedCurrency: baseCurrency, exchangeRate: null,
    };
  }

  /**
   * Live checkout preview for the card form: given a plan + card BIN, return the
   * amount/currency that would actually be charged (TRY-converted for TR cards on
   * iyzico) plus the detected card brand/bank. No payment is created.
   */
  static async quote(tenantId: string, planId: string, bin: string, provider: PaymentProvider = 'IYZICO'): Promise<{
    baseAmount: number;
    baseCurrency: string;
    isTurkish: boolean;
    chargedAmount: number;
    chargedCurrency: string;
    exchangeRate: number | null;
    brand: string | null;
    bankName: string | null;
  }> {
    const r = await TenantSubscriptionService.resolveCharge(tenantId, planId, bin, provider);
    return {
      baseAmount: r.baseAmount,
      baseCurrency: r.baseCurrency,
      isTurkish: r.isTurkish,
      chargedAmount: r.chargedAmount,
      chargedCurrency: r.chargedCurrency,
      exchangeRate: r.exchangeRate,
      brand: r.binInfo?.brand ?? null,
      bankName: r.binInfo?.bankName ?? null,
    };
  }

  /**
   * Pay for a subscription with a raw card via the custom card form. Detects the
   * card's BIN, converts the price to TRY when a Turkish card pays via a
   * TRY-settling provider, and charges.
   *
   * **3DS is decided automatically**: a commercial card (`force3ds`) or a Turkish
   * card goes through the 3D Secure flow (returns `requires_3ds` + the bank's HTML
   * to render); everything else is charged synchronously (`completed`). 3DS only
   * kicks in when a `callbackUrl` is supplied and the provider supports it.
   *
   * The original price + rate are persisted on the Payment metadata for
   * audit/invoicing; the Payment amount/currency hold the actual charge.
   */
  static async payWithCard(params: {
    tenantId: string;
    planId: string;
    card: CreditCardInput;
    provider?: PaymentProvider;
    customerEmail?: string;
    customerName?: string;
    ip?: string;
    /** Where the bank returns after 3DS. When omitted, 3DS is skipped (non-3DS only). */
    callbackUrl?: string;
  }): Promise<
    | { status: 'completed'; paymentId: string; subscription: TenantSubscription; chargedAmount: number; chargedCurrency: string; exchangeRate: number | null }
    | { status: 'requires_3ds'; paymentId: string; htmlContent: string; chargedAmount: number; chargedCurrency: string; exchangeRate: number | null }
  > {
    const provider: PaymentProvider = params.provider ?? 'IYZICO';
    if (!PaymentService.supportsDirectCardPayment(provider)) {
      throw new Error(SUBSCRIPTION_MESSAGES.CARD_PROVIDER_UNSUPPORTED);
    }

    const bin = params.card.cardNumber.replace(/\D/g, '').slice(0, 8);
    const resolved = await TenantSubscriptionService.resolveCharge(params.tenantId, params.planId, bin, provider);
    const { product, baseAmount, baseCurrency, chargedAmount, chargedCurrency, exchangeRate, binInfo } = resolved;
    const billingInterval = resolved.plan.interval;

    const payment = await PaymentService.create({
      tenantId: params.tenantId,
      provider,
      amount: chargedAmount,
      currency: chargedCurrency as PaymentCurrency,
      paymentMethod: 'CREDIT_CARD',
      description: `${product.name} Subscription (${billingInterval.toLowerCase()})`,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      metadata: {
        type: 'subscription',
        planId: params.planId,
        billingInterval,
        tenantId: params.tenantId,
        originalAmount: baseAmount,
        originalCurrency: baseCurrency,
        exchangeRate,
        chargedAmountTRY: chargedCurrency === 'TRY' ? chargedAmount : undefined,
        binCountry: binInfo?.country ?? undefined,
        binBank: binInfo?.bankName ?? undefined,
      },
    });

    const fullName = (params.customerName || '').trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const name = parts[0] || 'Tenant';
    const surname = parts.slice(1).join(' ') || 'Admin';

    const chargeParams = {
      amount: chargedAmount,
      currency: chargedCurrency,
      description: `${product.name} Subscription`,
      card: {
        cardHolderName: params.card.cardholderName,
        cardNumber: params.card.cardNumber.replace(/\s/g, ''),
        expireMonth: params.card.expiryMonth,
        expireYear: params.card.expiryYear,
        cvc: params.card.cvv,
      },
      buyer: { id: params.tenantId, name, surname, email: params.customerEmail, ip: params.ip },
      basketItems: [{ id: params.planId, name: product.name, price: chargedAmount }],
      metadata: { paymentId: payment.paymentId },
    };

    // Auto-3DS: commercial or Turkish cards go through 3D Secure when possible.
    const use3ds =
      !!params.callbackUrl &&
      PaymentService.supports3dsCardPayment(provider) &&
      !!(binInfo?.force3ds || binInfo?.isTurkish);

    if (use3ds) {
      const init = await PaymentService.start3dsCharge(
        params.tenantId,
        { ...chargeParams, callbackUrl: params.callbackUrl! },
        provider,
      );
      if (init.status !== 'success' || !init.htmlContent) {
        await PaymentService.markAsFailed(payment.paymentId, init.errorCode, init.errorMessage);
        throw new Error(init.errorMessage || SUBSCRIPTION_MESSAGES.CARD_PAYMENT_FAILED);
      }
      // Mid-3DS: mark PROCESSING so the (idempotent) callback can finalize it.
      await PaymentService.update(payment.paymentId, { status: 'PROCESSING' });
      return { status: 'requires_3ds', paymentId: payment.paymentId, htmlContent: init.htmlContent, chargedAmount, chargedCurrency, exchangeRate };
    }

    const charge = await PaymentService.chargeWithCard(params.tenantId, chargeParams, provider);

    if (charge.status !== 'success') {
      await PaymentService.markAsFailed(payment.paymentId, charge.errorCode, charge.errorMessage);
      throw new Error(charge.errorMessage || SUBSCRIPTION_MESSAGES.CARD_DECLINED);
    }

    if (charge.providerPaymentId) {
      await PaymentService.update(payment.paymentId, {
        providerPaymentId: charge.providerPaymentId,
        metadata: { ...((payment.metadata as object) || {}), providerPaymentId: charge.providerPaymentId },
      });
    }

    const subscription = await TenantSubscriptionService.confirmPayment(payment.paymentId);

    return { status: 'completed', paymentId: payment.paymentId, subscription, chargedAmount, chargedCurrency, exchangeRate };
  }

  /**
   * Finalize a 3DS subscription payment after the bank callback. `conversationId`
   * is our own paymentId (echoed back by iyzico); `providerPaymentId` is iyzico's.
   * On success the subscription is activated (idempotent via `confirmPayment`).
   */
  static async complete3dsCardPayment(params: {
    tenantId: string;
    conversationId: string;
    providerPaymentId: string;
    provider?: PaymentProvider;
  }): Promise<TenantSubscription> {
    const provider: PaymentProvider = params.provider ?? 'IYZICO';
    const ourPaymentId = params.conversationId;

    const result = await PaymentService.complete3dsCharge(
      params.tenantId,
      { conversationId: params.conversationId, paymentId: params.providerPaymentId },
      provider,
    );

    if (result.status !== 'success') {
      await PaymentService.markAsFailed(ourPaymentId, result.errorCode, result.errorMessage);
      throw new Error(result.errorMessage || SUBSCRIPTION_MESSAGES.CARD_DECLINED);
    }

    if (result.providerPaymentId) {
      await PaymentService.update(ourPaymentId, { providerPaymentId: result.providerPaymentId });
    }

    return TenantSubscriptionService.confirmPayment(ourPaymentId);
  }

  // ============================================================================
  // Express Checkout (Stripe Element wallets: Apple/Google Pay, Click to Pay, …)
  // ============================================================================

  /**
   * Begin an Express Checkout: create a PENDING Payment + a provider PaymentIntent,
   * and return the client secret + publishable key for the front-end Element. The
   * front end confirms the intent (wallet UI), then calls
   * {@link confirmExpressCheckout} to activate the subscription.
   */
  static async startExpressCheckout(params: {
    tenantId: string;
    planId: string;
    provider?: PaymentProvider;
    customerEmail?: string;
    customerName?: string;
  }): Promise<{ paymentId: string; clientSecret: string; publishableKey: string | null; amount: number; currency: string }> {
    const provider: PaymentProvider = params.provider ?? 'STRIPE';

    const sysDs = await tenantDataSourceFor(params.tenantId);
    const plan = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId: params.tenantId, planId: params.planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await TenantSubscriptionService.fetchProductOrThrow(params.tenantId, plan.productId);

    const billingInterval = plan.interval;
    const amount = Number(product.basePrice);
    const currency = product.currency as PaymentCurrency;

    const payment = await PaymentService.create({
      tenantId: params.tenantId,
      provider,
      amount,
      currency,
      paymentMethod: 'CREDIT_CARD',
      description: `${product.name} Subscription (${billingInterval.toLowerCase()})`,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      metadata: { type: 'subscription', planId: params.planId, billingInterval, tenantId: params.tenantId },
    });

    const intent = await PaymentService.createPaymentIntent(
      params.tenantId,
      { amount, currency, description: `${product.name} Subscription`, metadata: { paymentId: payment.paymentId } },
      provider,
    );

    await PaymentService.update(payment.paymentId, {
      providerPaymentId: intent.providerRef,
      metadata: { ...((payment.metadata as object) || {}), stripePaymentIntentId: intent.providerRef },
    });

    return { paymentId: payment.paymentId, clientSecret: intent.clientSecret, publishableKey: intent.publishableKey, amount, currency };
  }

  /**
   * Finalize an Express Checkout after the front-end confirms the wallet payment.
   * Verifies the PaymentIntent actually succeeded **server-side** (never trusts the
   * client) before activating the subscription (idempotent via `confirmPayment`).
   */
  static async confirmExpressCheckout(params: {
    tenantId: string;
    paymentId: string;
    provider?: PaymentProvider;
  }): Promise<TenantSubscription> {
    const provider: PaymentProvider = params.provider ?? 'STRIPE';
    const payment = await PaymentService.getById(params.paymentId);
    if (!payment) throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_NOT_FOUND);

    const ref = (payment.metadata as { stripePaymentIntentId?: string } | null)?.stripePaymentIntentId
      || payment.providerPaymentId;
    if (!ref) throw new Error(SUBSCRIPTION_MESSAGES.INVALID_REQUEST);

    const status = await PaymentService.getProviderStatus({ tenantId: params.tenantId, token: ref, provider });
    if (status !== 'succeeded') {
      throw new Error(SUBSCRIPTION_MESSAGES.CARD_PAYMENT_FAILED);
    }

    return TenantSubscriptionService.confirmPayment(params.paymentId);
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
      const { ROOT_TENANT_ID } = await import('@/modules/tenant/tenant.constants');
      const val = await SettingService.getValue(ROOT_TENANT_ID, 'subscriptionGracePeriodDays');
      const parsed = val ? parseInt(val, 10) : NaN;
      return isNaN(parsed) || parsed < 0 ? this.GRACE_PERIOD_DAYS_DEFAULT : parsed;
    } catch {
      return this.GRACE_PERIOD_DAYS_DEFAULT;
    }
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
      const plan = await this.getPlanById(ROOT_TENANT_ID, planId);
      if (!plan.product) {
        throw new Error('This plan references a deleted product and cannot be the default.');
      }
      if (plan.product.basePrice !== 0) {
        throw new Error('Only a free plan (base price 0) can be set as the default plan.');
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
