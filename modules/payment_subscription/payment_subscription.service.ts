import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { SubscriptionPlan as PlanEntity } from './entities/subscription_plan.entity'
import { PlanFeature as PlanFeatureEntity } from './entities/plan_feature.entity'
import { Subscription as SubscriptionEntity } from './entities/subscription.entity'
import {
  SubscriptionPlanSchema, PlanFeatureSchema, PlanWithFeaturesSchema,
  SubscriptionSchema, SubscriptionWithPlanSchema, ProrationPreviewSchema,
  type SubscriptionPlan, type PlanFeature, type PlanWithFeatures,
  type Subscription, type SubscriptionWithPlan, type ProrationPreview,
} from './payment_subscription.types'
import type {
  CreatePlanDTO, UpdatePlanDTO, GetPlansQuery,
  CreateFeatureDTO, UpdateFeatureDTO,
  CreateSubscriptionDTO, CancelSubscriptionDTO, PauseSubscriptionDTO,
  ChangePlanDTO, GetSubscriptionsQuery,
} from './payment_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from './payment_subscription.messages'
import ProrationService from './payment_subscription.proration.service'
import type { BillingCycle } from './payment_subscription.enums'

const CACHE_TTL = 300

export default class PaymentSubscriptionService {

  // ============================================================================
  // Plans
  // ============================================================================

  static async createPlan(tenantId: string, data: CreatePlanDTO): Promise<SubscriptionPlan> {
    try {
      const ds = await tenantDataSourceFor(tenantId)
      const repo = ds.getRepository(PlanEntity)
      if (data.isDefault) {
        await repo.update({ tenantId, isDefault: true }, { isDefault: false })
      }
      const plan = repo.create({ tenantId, ...data })
      const saved = await repo.save(plan)
      await redis.del(`sub:plans:${tenantId}`)
      return SubscriptionPlanSchema.parse(saved)
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED}: ${error}`)
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED)
    }
  }

  static async updatePlan(tenantId: string, planId: string, data: UpdatePlanDTO): Promise<SubscriptionPlan> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PlanEntity)
    const existing = await repo.findOne({ where: { tenantId, planId } })
    if (!existing) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    if (data.isDefault) {
      await repo.update({ tenantId, isDefault: true }, { isDefault: false })
    }
    Object.assign(existing, data)
    const saved = await repo.save(existing)
    await redis.del(`sub:plans:${tenantId}`)
    await redis.del(`sub:plan:${planId}`)
    return SubscriptionPlanSchema.parse(saved)
  }

  static async getPlan(tenantId: string, planId: string, withFeatures = false): Promise<SubscriptionPlan | PlanWithFeatures> {
    return singleFlight(`sub:plan:${planId}:${withFeatures}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const plan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId } })
      if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
      if (!withFeatures) return SubscriptionPlanSchema.parse(plan)
      const features = await ds.getRepository(PlanFeatureEntity).find({
        where: { tenantId, planId }, order: { sortOrder: 'ASC' },
      })
      return PlanWithFeaturesSchema.parse({ ...plan, features })
    })
  }

  static async listPlans(
    tenantId: string, query: GetPlansQuery,
  ): Promise<{ data: Array<SubscriptionPlan | PlanWithFeatures>; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.status) where['status'] = query.status
    const [rows, total] = await ds.getRepository(PlanEntity).findAndCount({
      where, order: { sortOrder: 'ASC', createdAt: 'ASC' },
      skip: query.page * query.pageSize, take: query.pageSize,
    })
    if (!query.includeFeatures) {
      return { data: rows.map((r) => SubscriptionPlanSchema.parse(r)), total }
    }
    const featureRepo = ds.getRepository(PlanFeatureEntity)
    const planIds = rows.map((r) => r.planId)
    const allFeatures = planIds.length
      ? await featureRepo.find({ where: planIds.map((id) => ({ tenantId, planId: id })) })
      : []
    const featureMap = new Map<string, PlanFeature[]>()
    for (const f of allFeatures) {
      const arr = featureMap.get(f.planId) ?? []
      arr.push(PlanFeatureSchema.parse(f))
      featureMap.set(f.planId, arr)
    }
    return {
      data: rows.map((r) => PlanWithFeaturesSchema.parse({ ...r, features: featureMap.get(r.planId) ?? [] })),
      total,
    }
  }

  static async deletePlan(tenantId: string, planId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const activeCount = await ds.getRepository(SubscriptionEntity).count({
      where: { tenantId, planId, status: 'ACTIVE' },
    })
    if (activeCount > 0) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_HAS_ACTIVE_SUBSCRIBERS)
    await ds.getRepository(PlanEntity).softDelete({ tenantId, planId })
    await redis.del(`sub:plans:${tenantId}`)
    await redis.del(`sub:plan:${planId}`)
    await redis.del(`sub:plan:${planId}:true`)
    await redis.del(`sub:plan:${planId}:false`)
  }

  // ============================================================================
  // Features
  // ============================================================================

  static async upsertFeature(tenantId: string, planId: string, data: CreateFeatureDTO): Promise<PlanFeature> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(PlanFeatureEntity)
    let feature = await repo.findOne({ where: { tenantId, planId, key: data.key } })
    if (feature) {
      Object.assign(feature, data)
    } else {
      feature = repo.create({ tenantId, planId, ...data })
    }
    const saved = await repo.save(feature)
    await redis.del(`sub:plan:${planId}:true`)
    return PlanFeatureSchema.parse(saved)
  }

  static async deleteFeature(tenantId: string, planId: string, featureId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    await ds.getRepository(PlanFeatureEntity).delete({ tenantId, planId, featureId })
    await redis.del(`sub:plan:${planId}:true`)
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  static async createSubscription(tenantId: string, data: CreateSubscriptionDTO): Promise<Subscription> {
    const ds = await tenantDataSourceFor(tenantId)
    const plan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId: data.planId } })
    if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)

    const cycle = data.billingCycle as BillingCycle
    const amount = data.currency
      ? ProrationService.cycleAmount(plan.monthlyPrice, plan.yearlyPrice, cycle)
      : ProrationService.cycleAmount(plan.monthlyPrice, plan.yearlyPrice, cycle)

    const periodStart = data.currentPeriodStart ?? new Date()
    const periodEnd = data.currentPeriodEnd ?? ProrationService.nextPeriodEnd(periodStart, cycle)
    const hasTrialDays = plan.trialDays > 0 && !data.trialEndsAt
    const trialEndsAt = data.trialEndsAt ?? (hasTrialDays
      ? (() => { const d = new Date(); d.setDate(d.getDate() + plan.trialDays); return d })()
      : undefined)

    try {
      const repo = ds.getRepository(SubscriptionEntity)
      const sub = repo.create({
        tenantId,
        userId: data.userId,
        planId: data.planId,
        provider: data.provider,
        providerSubscriptionId: data.providerSubscriptionId,
        providerCustomerId: data.providerCustomerId,
        status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
        billingCycle: data.billingCycle,
        amount,
        currency: data.currency ?? plan.currency,
        trialEndsAt,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        metadata: data.metadata,
      })
      const saved = await repo.save(sub)
      return SubscriptionSchema.parse(saved)
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CREATE_FAILED}: ${error}`)
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CREATE_FAILED)
    }
  }

  static async getSubscription(tenantId: string, subscriptionId: string, withPlan = false): Promise<Subscription | SubscriptionWithPlan> {
    return singleFlight(`sub:id:${subscriptionId}:${withPlan}`, async () => {
      const ds = await tenantDataSourceFor(tenantId)
      const sub = await ds.getRepository(SubscriptionEntity).findOne({ where: { tenantId, subscriptionId } })
      if (!sub) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND)
      if (!withPlan) return SubscriptionSchema.parse(sub)
      const plan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId: sub.planId } })
      if (!plan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
      const features = await ds.getRepository(PlanFeatureEntity).find({
        where: { tenantId, planId: sub.planId }, order: { sortOrder: 'ASC' },
      })
      return SubscriptionWithPlanSchema.parse({ ...sub, plan: { ...plan, features } })
    })
  }

  static async listSubscriptions(
    tenantId: string, query: GetSubscriptionsQuery,
  ): Promise<{ data: Subscription[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.userId) where['userId'] = query.userId
    if (query.planId) where['planId'] = query.planId
    if (query.status) where['status'] = query.status
    if (query.provider) where['provider'] = query.provider
    const [rows, total] = await ds.getRepository(SubscriptionEntity).findAndCount({
      where, order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize, take: query.pageSize,
    })
    return { data: rows.map((r) => SubscriptionSchema.parse(r)), total }
  }

  static async cancelSubscription(tenantId: string, subscriptionId: string, dto: CancelSubscriptionDTO): Promise<Subscription> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SubscriptionEntity)
    const sub = await repo.findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND)
    if (sub.status === 'CANCELLED') throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ALREADY_CANCELLED)

    sub.cancelAtPeriodEnd = dto.cancelAtPeriodEnd
    sub.cancellationReason = dto.reason ?? undefined
    if (!dto.cancelAtPeriodEnd) {
      sub.status = 'CANCELLED'
      sub.cancelledAt = new Date()
    }
    const saved = await repo.save(sub)
    await redis.del(`sub:id:${subscriptionId}:true`)
    await redis.del(`sub:id:${subscriptionId}:false`)
    return SubscriptionSchema.parse(saved)
  }

  static async pauseSubscription(tenantId: string, subscriptionId: string, dto: PauseSubscriptionDTO): Promise<Subscription> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SubscriptionEntity)
    const sub = await repo.findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND)
    if (!['ACTIVE', 'TRIALING'].includes(sub.status)) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_ACTIVE)

    sub.status = 'PAUSED'
    sub.pausedAt = new Date()
    sub.pausedUntil = dto.pausedUntil ?? undefined
    const saved = await repo.save(sub)
    await redis.del(`sub:id:${subscriptionId}:true`)
    await redis.del(`sub:id:${subscriptionId}:false`)
    return SubscriptionSchema.parse(saved)
  }

  static async resumeSubscription(tenantId: string, subscriptionId: string): Promise<Subscription> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(SubscriptionEntity)
    const sub = await repo.findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND)
    if (sub.status !== 'PAUSED') throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_ACTIVE)

    sub.status = 'ACTIVE'
    sub.pausedAt = undefined
    sub.pausedUntil = undefined
    const saved = await repo.save(sub)
    await redis.del(`sub:id:${subscriptionId}:true`)
    await redis.del(`sub:id:${subscriptionId}:false`)
    return SubscriptionSchema.parse(saved)
  }

  static async changePlan(tenantId: string, subscriptionId: string, dto: ChangePlanDTO): Promise<Subscription> {
    const ds = await tenantDataSourceFor(tenantId)
    const subRepo = ds.getRepository(SubscriptionEntity)
    const planRepo = ds.getRepository(PlanEntity)

    const sub = await subRepo.findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND)

    const newPlan = await planRepo.findOne({ where: { tenantId, planId: dto.newPlanId } })
    if (!newPlan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)

    const cycle = (dto.billingCycle ?? sub.billingCycle) as BillingCycle
    sub.planId = dto.newPlanId
    if (dto.billingCycle) sub.billingCycle = dto.billingCycle
    sub.amount = ProrationService.cycleAmount(newPlan.monthlyPrice, newPlan.yearlyPrice, cycle)

    if (dto.prorate && sub.currentPeriodStart && sub.currentPeriodEnd) {
      const periodEnd = ProrationService.nextPeriodEnd(new Date(), cycle)
      sub.currentPeriodStart = new Date()
      sub.currentPeriodEnd = periodEnd
    }

    const saved = await subRepo.save(sub)
    await redis.del(`sub:id:${subscriptionId}:true`)
    await redis.del(`sub:id:${subscriptionId}:false`)
    return SubscriptionSchema.parse(saved)
  }

  static async prorationPreview(
    tenantId: string, subscriptionId: string, dto: ChangePlanDTO,
  ): Promise<ProrationPreview> {
    const ds = await tenantDataSourceFor(tenantId)
    const sub = await ds.getRepository(SubscriptionEntity).findOne({ where: { tenantId, subscriptionId } })
    if (!sub) throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND)
    const newPlan = await ds.getRepository(PlanEntity).findOne({ where: { tenantId, planId: dto.newPlanId } })
    if (!newPlan) throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)

    const cycle = (dto.billingCycle ?? sub.billingCycle) as BillingCycle
    const newAmount = ProrationService.cycleAmount(newPlan.monthlyPrice, newPlan.yearlyPrice, cycle)

    return ProrationService.preview(
      Number(sub.amount),
      newAmount,
      cycle,
      sub.currentPeriodStart ?? new Date(),
      sub.currentPeriodEnd ?? new Date(),
      sub.currency,
    )
  }

  // ============================================================================
  // Feature access
  // ============================================================================

  static async checkFeature(tenantId: string, subscriptionId: string, key: string): Promise<{ allowed: boolean; value: string | null }> {
    const ds = await tenantDataSourceFor(tenantId)
    const sub = await ds.getRepository(SubscriptionEntity).findOne({ where: { tenantId, subscriptionId } })
    if (!sub || !['ACTIVE', 'TRIALING'].includes(sub.status)) return { allowed: false, value: null }
    const feature = await ds.getRepository(PlanFeatureEntity).findOne({ where: { tenantId, planId: sub.planId, key } })
    if (!feature) return { allowed: false, value: null }
    const allowed = feature.type === 'BOOLEAN' ? feature.value === 'true' : true
    return { allowed, value: feature.value }
  }
}
