import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import redis, { jitter, singleFlight } from '@/modules/redis';
import { env } from '@/modules/env';
import Logger from '@/modules/logger';
import { SubscriptionPlan as PlanEntity } from './entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from './entities/plan_feature.entity';
import { Subscription as SubscriptionEntity } from './entities/subscription.entity';
import { StoreProduct as ProductEntity } from '@/modules/store/entities/store_product.entity';
import {
  SubscriptionPlanSchema, PlanFeatureSchema, PlanWithFeaturesSchema,
  PlanWithProductSchema, PlanProductSummarySchema,
  type SubscriptionPlan, type PlanFeature, type PlanWithFeatures,
  type PlanWithProduct, type PlanProductSummary,
} from './payment_subscription.types';
import type { CreatePlanDTO, UpdatePlanDTO, GetPlansQuery, CreateFeatureDTO } from './payment_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './payment_subscription.messages';
import { AppError, ErrorCode } from '@/modules/common/app-error';

export default class PaymentSubscriptionPlanService {

  // ──────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────

  static productSummary(p: ProductEntity): PlanProductSummary {
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

  static async fetchProductOrThrow(tenantId: string, productId: string): Promise<ProductEntity> {
    const ds = await tenantDataSourceFor(tenantId);
    const product = await ds.getRepository(ProductEntity).findOne({ where: { tenantId, productId } });
    if (!product) throw new AppError(SUBSCRIPTION_MESSAGES.PRODUCT_NOT_FOUND_FOR_PLAN, 404, ErrorCode.NOT_FOUND);
    return product;
  }

  // ──────────────────────────────────────────────
  // Plan CRUD
  // ──────────────────────────────────────────────

  static async createPlan(tenantId: string, data: CreatePlanDTO): Promise<PlanWithProduct> {
    try {
      const product = await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, data.productId);
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(PlanEntity);
      const plan = repo.create({ tenantId, ...data });
      const saved = await repo.save(plan);
      await redis.del(`sub:plans:${tenantId}`);
      return PlanWithProductSchema.parse({
        ...SubscriptionPlanSchema.parse(saved),
        product: PaymentSubscriptionPlanService.productSummary(product),
      });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED}: ${error}`);
      throw error instanceof AppError ? error : new AppError(SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }

  static async updatePlan(tenantId: string, planId: string, data: UpdatePlanDTO): Promise<PlanWithProduct> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PlanEntity);
    const existing = await repo.findOne({ where: { tenantId, planId } });
    if (!existing) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (data.productId && data.productId !== existing.productId) {
      await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, data.productId);
    }
    Object.assign(existing, data);
    const saved = await repo.save(existing);
    const product = await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, saved.productId);
    await redis.del(`sub:plans:${tenantId}`);
    await redis.del(`sub:plan:${planId}`);
    await redis.del(`sub:plan:${planId}:true`);
    await redis.del(`sub:plan:${planId}:false`);
    return PlanWithProductSchema.parse({
      ...SubscriptionPlanSchema.parse(saved),
      product: PaymentSubscriptionPlanService.productSummary(product),
    });
  }

  static async getPlan(tenantId: string, planId: string, withFeatures = false): Promise<PlanWithProduct | PlanWithFeatures> {
    // Read-through Redis cache. The matching `redis.del('sub:plan:<id>:<bool>')`
    // calls in updatePlan/deletePlan/upsertFeature already invalidate these keys —
    // they previously deleted keys nobody wrote, so this only adds the write side.
    const cacheKey = `sub:plan:${planId}:${withFeatures}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        const obj = JSON.parse(cached);
        return withFeatures ? PlanWithFeaturesSchema.parse(obj) : PlanWithProductSchema.parse(obj);
      } catch { await redis.del(cacheKey).catch(() => {}); }
    }
    return singleFlight(cacheKey, async () => {
      const ds = await tenantDataSourceFor(tenantId);
      const plan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId } });
      if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
      const product = await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, plan.productId);
      const base = {
        ...SubscriptionPlanSchema.parse(plan),
        product: PaymentSubscriptionPlanService.productSummary(product),
      };
      const result = withFeatures
        ? PlanWithFeaturesSchema.parse({
            ...base,
            features: await ds.getRepository(PlanFeatureEntity).find({
              where: { tenantId, planId }, order: { sortOrder: 'ASC' },
            }),
          })
        : PlanWithProductSchema.parse(base);
      await redis.setex(cacheKey, jitter(env.TENANT_CACHE_TTL ?? 300), JSON.stringify(result)).catch(() => {});
      return result;
    });
  }

  static async listPlans(
    tenantId: string,
    query: GetPlansQuery,
  ): Promise<{ data: Array<PlanWithProduct | PlanWithFeatures>; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.status) where['status'] = query.status;
    const [rows, total] = await ds.getRepository(PlanEntity).findAndCount({
      where, order: { createdAt: 'ASC' },
      skip: query.page * query.pageSize, take: query.pageSize,
    });

    const productIds = Array.from(new Set(rows.map((r) => r.productId)));
    const productRepo = ds.getRepository(ProductEntity);
    const products = productIds.length
      ? await productRepo.findBy(productIds.map((productId) => ({ tenantId, productId })))
      : [];
    const productMap = new Map(products.map((p) => [p.productId, p]));

    if (!query.includeFeatures) {
      return {
        data: rows.map((r) => {
          const product = productMap.get(r.productId);
          if (!product) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_REFERENCES_MISSING_PRODUCT, 500, ErrorCode.INTERNAL_ERROR);
          return PlanWithProductSchema.parse({
            ...SubscriptionPlanSchema.parse(r),
            product: PaymentSubscriptionPlanService.productSummary(product),
          });
        }),
        total,
      };
    }

    const featureRepo = ds.getRepository(PlanFeatureEntity);
    const planIds = rows.map((r) => r.planId);
    const allFeatures = planIds.length
      ? await featureRepo.find({ where: planIds.map((id) => ({ tenantId, planId: id })) })
      : [];
    const featureMap = new Map<string, PlanFeature[]>();
    for (const f of allFeatures) {
      const arr = featureMap.get(f.planId) ?? [];
      arr.push(PlanFeatureSchema.parse(f));
      featureMap.set(f.planId, arr);
    }
    return {
      data: rows.map((r) => {
        const product = productMap.get(r.productId);
        if (!product) throw new Error(`Plan ${r.planId} references missing product ${r.productId}`);
        return PlanWithFeaturesSchema.parse({
          ...SubscriptionPlanSchema.parse(r),
          product: PaymentSubscriptionPlanService.productSummary(product),
          features: featureMap.get(r.planId) ?? [],
        });
      }),
      total,
    };
  }

  static async deletePlan(tenantId: string, planId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    const activeCount = await ds.getRepository(SubscriptionEntity).count({
      where: { tenantId, planId, status: 'ACTIVE' },
    });
    if (activeCount > 0) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_HAS_ACTIVE_SUBSCRIBERS, 409, ErrorCode.CONFLICT);
    await ds.getRepository(PlanEntity).softDelete({ tenantId, planId });
    await redis.del(`sub:plans:${tenantId}`);
    await redis.del(`sub:plan:${planId}`);
    await redis.del(`sub:plan:${planId}:true`);
    await redis.del(`sub:plan:${planId}:false`);
  }

  // ──────────────────────────────────────────────
  // Plan Features
  // ──────────────────────────────────────────────

  static async upsertFeature(tenantId: string, planId: string, data: CreateFeatureDTO): Promise<PlanFeature> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(PlanFeatureEntity);
    let feature = await repo.findOne({ where: { tenantId, planId, key: data.key } });
    if (feature) {
      Object.assign(feature, data);
    } else {
      feature = repo.create({ tenantId, planId, ...data });
    }
    const saved = await repo.save(feature);
    await redis.del(`sub:plan:${planId}:true`);
    return PlanFeatureSchema.parse(saved);
  }

  static async deleteFeature(tenantId: string, planId: string, featureId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId);
    await ds.getRepository(PlanFeatureEntity).delete({ tenantId, planId, featureId });
    await redis.del(`sub:plan:${planId}:true`);
  }

  // ──────────────────────────────────────────────
  // Feature Access Check
  // ──────────────────────────────────────────────

  static async checkFeature(tenantId: string, subscriptionId: string, key: string): Promise<{ allowed: boolean; value: string | null }> {
    const ds = await tenantDataSourceFor(tenantId);
    const sub = await ds.getRepository(SubscriptionEntity).findOne({ where: { tenantId, subscriptionId } });
    if (!sub || !['ACTIVE', 'TRIALING'].includes(sub.status)) return { allowed: false, value: null };
    const feature = await ds.getRepository(PlanFeatureEntity).findOne({ where: { tenantId, planId: sub.planId, key } });
    if (!feature) return { allowed: false, value: null };
    const allowed = feature.type === 'BOOLEAN' ? feature.value === 'true' : true;
    return { allowed, value: feature.value };
  }
}
