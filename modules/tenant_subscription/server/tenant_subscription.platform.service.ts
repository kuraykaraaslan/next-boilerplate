import 'reflect-metadata';
import { tenantDataSourceFor } from '@nb/db';
import { SubscriptionPlan as SubscriptionPlanEntity } from '@nb/payment/server/entities/subscription_plan.entity';
import { PlanFeature as PlanFeatureEntity } from '@nb/payment/server/entities/plan_feature.entity';
import { StoreProduct as ProductEntity } from '@nb/store/server/entities/store_product.entity';
import { StoreCategory as CategoryEntity } from '@nb/store/server/entities/store_category.entity';
import { ROOT_TENANT_ID, isRootTenant } from '@nb/tenant/server/tenant.constants';
import Logger from '@nb/logger';
import type { TenantSubscription } from './tenant_subscription.types';
import type { AssignPlatformPlanDTO } from './tenant_subscription.dto';
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import TenantPlanService from './tenant_subscription.plan.service';
import TenantSubscriptionService from './tenant_subscription.service';

/**
 * Root-admin platform-plan assignment: clones a ROOT (Platform) catalogue plan
 * into a target tenant and assigns it for free, delegating the final assignment
 * to {@link TenantSubscriptionService.assignPlan}.
 */
export default class TenantPlatformPlanService {

  /**
   * Root-admin only: take a plan from the ROOT (Platform) catalogue, clone its
   * category/product/plan/feature chain into the target tenant, and assign it
   * for free (no payment). Idempotent — re-assigning the same source plan reuses
   * the cloned rows (updating price + features) instead of duplicating them.
   *
   * The assignment is always free because {@link TenantSubscriptionService.assignPlan}
   * bypasses payment; `priceOverride` only sets the cloned product's `basePrice`
   * (what the tenant would pay on a future self-service renewal). Omit to copy the
   * source price, pass `0` for a free-forever plan.
   */
  static async assignPlatformPlan(targetTenantId: string, data: AssignPlatformPlanDTO): Promise<TenantSubscription> {
    if (isRootTenant(targetTenantId)) {
      throw new AppError(SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_SELF_ASSIGN, 422, ErrorCode.VALIDATION_ERROR);
    }

    try {
      // 1. Load the source plan (+ product + features) from the ROOT catalogue.
      const source = await TenantPlanService.getPlanWithFeatures(ROOT_TENANT_ID, data.planId);
      if (!source.product) throw new AppError(SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_MISSING_PRODUCT, 422, ErrorCode.VALIDATION_ERROR);
      const sourceProduct = source.product;

      const ds = await tenantDataSourceFor(targetTenantId);
      const sku = `platform-plan:${source.planId}`;
      const basePrice = data.priceOverride ?? sourceProduct.basePrice;

      const clonedPlanId = await ds.transaction(async (mgr) => {
        // 2a. find-or-create a "Platform Plans" category in the target tenant.
        const catRepo = mgr.getRepository(CategoryEntity);
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
        const prodRepo = mgr.getRepository(ProductEntity);
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
        const planRepo = mgr.getRepository(SubscriptionPlanEntity);
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
        const featRepo = mgr.getRepository(PlanFeatureEntity);
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

        return plan.planId;
      });

      // 3. assign the cloned plan — payment is bypassed, so this is free.
      return await TenantSubscriptionService.assignPlan(targetTenantId, {
        planId: clonedPlanId,
        billingInterval: data.billingInterval,
      });
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_ASSIGN_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof AppError) throw error;
      throw new AppError(SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_ASSIGN_FAILED, 500, ErrorCode.INTERNAL_ERROR);
    }
  }
}
