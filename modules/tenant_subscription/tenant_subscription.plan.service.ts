import 'reflect-metadata';
import { getDataSource, tenantDataSourceFor } from '@/modules/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../payment/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '../payment/entities/plan_feature.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import Logger from '@/modules/logger';
import {
  SubscriptionPlanSchema,
  PlanWithFeaturesSchema,
  PlanWithProductSchema,
  PlanFeatureSchema,
} from './tenant_subscription.types';
import type {
  PlanWithFeatures,
  PlanWithProduct,
  PlanFeature,
} from './tenant_subscription.types';
import type {
  CreatePlanDTO,
  UpdatePlanDTO,
  CreateFeatureDTO,
  UpdateFeatureDTO,
} from './tenant_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import type { SubscriptionPlanStatus } from './tenant_subscription.enums';
import {
  productSummary,
  fetchProductOrThrow,
  fetchProductOrNull,
  attachProducts,
  emitWebhook,
} from './tenant_subscription.helpers';

/**
 * Plan and plan-feature CRUD for tenant subscriptions. Split out of the core
 * {@link TenantSubscriptionService} so the catalogue-management surface stays
 * focused. Subscription assignment/billing live in the sibling services.
 */
export default class TenantPlanService {

  // ============================================================================
  // Plan CRUD Operations
  // ============================================================================

  static async createPlan(tenantId: string, data: CreatePlanDTO): Promise<PlanWithProduct> {
    try {
      const product = await fetchProductOrThrow(tenantId, data.productId);
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
      await emitWebhook(tenantId, 'plan.created', {
        planId: saved.planId,
        productId: saved.productId,
        interval: saved.interval,
        status: saved.status,
      });
      return PlanWithProductSchema.parse({
        ...SubscriptionPlanSchema.parse(saved),
        product: productSummary(product),
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
      await fetchProductOrThrow(tenantId, data.productId);
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
      await emitWebhook(tenantId, 'plan.updated', {
        planId: updated.planId,
        productId: updated.productId,
        interval: updated.interval,
        status: updated.status,
      });
      const product = await fetchProductOrThrow(tenantId, updated.productId);
      return PlanWithProductSchema.parse({
        ...SubscriptionPlanSchema.parse(updated),
        product: productSummary(product),
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
      await emitWebhook(tenantId, 'plan.deleted', { planId, productId: existing.productId });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED);
    }
  }

  static async getPlans(tenantId: string, status?: SubscriptionPlanStatus): Promise<PlanWithProduct[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    const plans = await ds.getRepository(SubscriptionPlanEntity).find({ where: where as any, order: { createdAt: 'ASC' } });
    const productMap = await attachProducts(tenantId, plans);
    return plans.map((p) => {
      const product = productMap.get(p.productId);
      return PlanWithProductSchema.parse({
        ...SubscriptionPlanSchema.parse(p),
        product: product ? productSummary(product) : null,
      });
    });
  }

  static async getPlanById(tenantId: string, planId: string): Promise<PlanWithProduct> {
    const ds = await tenantDataSourceFor(tenantId);
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await fetchProductOrNull(tenantId, plan.productId);
    return PlanWithProductSchema.parse({
      ...SubscriptionPlanSchema.parse(plan),
      product: product ? productSummary(product) : null,
    });
  }

  static async getPlanWithFeatures(tenantId: string, planId: string): Promise<PlanWithFeatures> {
    const ds = await tenantDataSourceFor(tenantId);
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND);
    const product = await fetchProductOrNull(tenantId, plan.productId);
    const features = await ds.getRepository(PlanFeatureEntity).find({ where: { tenantId, planId }, order: { sortOrder: 'ASC' } });
    return PlanWithFeaturesSchema.parse({
      ...SubscriptionPlanSchema.parse(plan),
      product: product ? productSummary(product) : null,
      features,
    });
  }

  static async getPlansWithFeatures(tenantId: string, status?: SubscriptionPlanStatus): Promise<PlanWithFeatures[]> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    const plans = await ds.getRepository(SubscriptionPlanEntity).find({ where: where as any, order: { createdAt: 'ASC' } });
    const productMap = await attachProducts(tenantId, plans);
    const planIds = plans.map((p) => p.planId);
    const allFeatures = planIds.length > 0
      ? await ds.getRepository(PlanFeatureEntity).find({ where: planIds.map((id) => ({ tenantId, planId: id })), order: { sortOrder: 'ASC' } })
      : [];

    return plans.map((plan) => {
      const product = productMap.get(plan.productId);
      return PlanWithFeaturesSchema.parse({
        ...SubscriptionPlanSchema.parse(plan),
        product: product ? productSummary(product) : null,
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
}
