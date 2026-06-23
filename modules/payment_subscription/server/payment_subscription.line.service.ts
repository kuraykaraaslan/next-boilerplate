import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import { Subscription as SubscriptionEntity } from './entities/subscription.entity'
import { SubscriptionPlan as PlanEntity } from './entities/subscription_plan.entity'
import { PlanFeature as PlanFeatureEntity } from './entities/plan_feature.entity'
import PaymentSubscriptionPlanService from './payment_subscription.plan.service'
import type { CreateFeatureDTO, UpdateFeatureDTO } from './payment_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from './payment_subscription.messages'
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error'
import type { PlanFeature } from './payment_subscription.types'

/**
 * Subscription document line items. A subscription's lines are the feature
 * rows of the plan it is bound to (the wrapped product carries the price; the
 * features describe what the recurring charge entitles the subscriber to).
 * Mutations proxy to the plan-feature store and re-sync the recurring amount.
 */
export default class PaymentSubscriptionLineService {
  private static async planIdFor(tenantId: string, subscriptionId: string): Promise<string> {
    const ds = await tenantDataSourceFor(tenantId)
    const sub = await ds.getRepository(SubscriptionEntity).findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    return sub.planId
  }

  /** Re-sync the recurring amount on the subscription from its plan's product price. */
  static async recompute(tenantId: string, subscriptionId: string): Promise<number> {
    const ds = await tenantDataSourceFor(tenantId)
    const subRepo = ds.getRepository(SubscriptionEntity)
    const sub = await subRepo.findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new AppError(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const plan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId: sub.planId } })
    if (!plan) throw new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const product = await PaymentSubscriptionPlanService.fetchProductOrThrow(tenantId, plan.productId)
    const amount = Number(product.basePrice)
    await subRepo.update({ tenantId, subscriptionId }, { amount, currency: product.currency })
    return amount
  }

  static async listByParent(
    tenantId: string,
    subscriptionId: string,
  ): Promise<{ data: PlanFeature[]; total: number }> {
    const planId = await this.planIdFor(tenantId, subscriptionId)
    const ds = await tenantDataSourceFor(tenantId)
    const [data, total] = await ds.getRepository(PlanFeatureEntity).findAndCount({
      where: { tenantId, planId },
      order: { sortOrder: 'ASC' },
    })
    return { data: data as unknown as PlanFeature[], total }
  }

  static async addLine(tenantId: string, subscriptionId: string, dto: CreateFeatureDTO): Promise<PlanFeature> {
    const planId = await this.planIdFor(tenantId, subscriptionId)
    const feature = await PaymentSubscriptionPlanService.upsertFeature(tenantId, planId, dto)
    await this.recompute(tenantId, subscriptionId)
    return feature
  }

  static async updateLine(
    tenantId: string,
    subscriptionId: string,
    featureId: string,
    dto: UpdateFeatureDTO,
  ): Promise<PlanFeature> {
    const planId = await this.planIdFor(tenantId, subscriptionId)
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PlanFeatureEntity)
    const row = await repo.findOne({ where: { tenantId, planId, featureId } })
    if (!row) throw new AppError(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    const merged = { key: row.key, label: dto.label ?? row.label, type: dto.type ?? row.type, value: dto.value ?? row.value, sortOrder: dto.sortOrder ?? row.sortOrder } as CreateFeatureDTO
    const feature = await PaymentSubscriptionPlanService.upsertFeature(tenantId, planId, merged)
    await this.recompute(tenantId, subscriptionId)
    return feature
  }

  static async deleteLine(tenantId: string, subscriptionId: string, featureId: string): Promise<void> {
    const planId = await this.planIdFor(tenantId, subscriptionId)
    await PaymentSubscriptionPlanService.deleteFeature(tenantId, planId, featureId)
    await this.recompute(tenantId, subscriptionId)
  }
}
