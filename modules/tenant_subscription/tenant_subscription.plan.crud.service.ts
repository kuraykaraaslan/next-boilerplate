import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '../payment/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '../payment/entities/plan_feature.entity';
import { TenantSubscription as TenantSubscriptionEntity } from './entities/tenant_subscription.entity';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import {
  SubscriptionPlanSchema,
  PlanWithFeaturesSchema,
  PlanWithProductSchema,
} from './tenant_subscription.types';
import type { PlanWithFeatures, PlanWithProduct } from './tenant_subscription.types';
import type { CreatePlanDTO, UpdatePlanDTO } from './tenant_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import type { SubscriptionPlanStatus } from './tenant_subscription.enums';
import {
  productSummary, fetchProductOrThrow, fetchProductOrNull, attachProducts, emitWebhook,
} from './tenant_subscription.helpers';

export default class TenantPlanCrudService {

  static async createPlan(tenantId: string, data: CreatePlanDTO): Promise<PlanWithProduct> {
    try {
      const product = await fetchProductOrThrow(tenantId, data.productId);
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(SubscriptionPlanEntity);
      const plan = repo.create({ tenantId, productId: data.productId, interval: data.interval, trialDays: data.trialDays, status: data.status });
      const saved = await repo.save(plan);
      await emitWebhook(tenantId, 'plan.created', { planId: saved.planId, productId: saved.productId, interval: saved.interval, status: saved.status });
      return PlanWithProductSchema.parse({ ...SubscriptionPlanSchema.parse(saved), product: productSummary(product) });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async updatePlan(tenantId: string, planId: string, data: UpdatePlanDTO): Promise<PlanWithProduct> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(SubscriptionPlanEntity);
    const existing = await repo.findOne({ where: { tenantId, planId } });
    if (!existing) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (data.productId && data.productId !== existing.productId) await fetchProductOrThrow(tenantId, data.productId);
    try {
      await repo.update({ tenantId, planId }, {
        ...(data.productId !== undefined && { productId: data.productId }),
        ...(data.interval !== undefined && { interval: data.interval }),
        ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
        ...(data.status !== undefined && { status: data.status }),
      } as any);
      const updated = await repo.findOne({ where: { tenantId, planId } });
      if (!updated) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      await emitWebhook(tenantId, 'plan.updated', { planId: updated.planId, productId: updated.productId, interval: updated.interval, status: updated.status });
      const product = await fetchProductOrThrow(tenantId, updated.productId);
      return PlanWithProductSchema.parse({ ...SubscriptionPlanSchema.parse(updated), product: productSummary(product) });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async deletePlan(tenantId: string, planId: string): Promise<void> {
    const sysDs = await tenantDataSourceFor(tenantId);
    const existing = await sysDs.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!existing) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const activeCount = await sysDs.getRepository(TenantSubscriptionEntity).count({ where: { tenantId, planId, status: 'ACTIVE' } });
    if (activeCount > 0) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_HAS_SUBSCRIPTIONS, 409, ErrorCode.CONFLICT);
    try {
      await sysDs.getRepository(SubscriptionPlanEntity).delete({ tenantId, planId });
      await emitWebhook(tenantId, 'plan.deleted', { planId, productId: existing.productId });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
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
      return PlanWithProductSchema.parse({ ...SubscriptionPlanSchema.parse(p), product: product ? productSummary(product) : null });
    });
  }

  static async getPlanById(tenantId: string, planId: string): Promise<PlanWithProduct> {
    const ds = await tenantDataSourceFor(tenantId);
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const product = await fetchProductOrNull(tenantId, plan.productId);
    return PlanWithProductSchema.parse({ ...SubscriptionPlanSchema.parse(plan), product: product ? productSummary(product) : null });
  }

  static async getPlanWithFeatures(tenantId: string, planId: string): Promise<PlanWithFeatures> {
    const ds = await tenantDataSourceFor(tenantId);
    const plan = await ds.getRepository(SubscriptionPlanEntity).findOne({ where: { tenantId, planId } });
    if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    const product = await fetchProductOrNull(tenantId, plan.productId);
    const features = await ds.getRepository(PlanFeatureEntity).find({ where: { tenantId, planId }, order: { sortOrder: 'ASC' } });
    return PlanWithFeaturesSchema.parse({ ...SubscriptionPlanSchema.parse(plan), product: product ? productSummary(product) : null, features });
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
}
