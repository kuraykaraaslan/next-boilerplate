import { prisma } from '@/libs/prisma'
import type { Prisma } from '@/prisma/client'
import Logger from '@/libs/logger'
import {
  SubscriptionPlanSchema,
  PlanWithFeaturesSchema,
  PlanFeatureSchema,
  TenantSubscriptionSchema,
  TenantSubscriptionWithPlanSchema,
} from './tenant_subscription.types'
import type {
  SubscriptionPlan,
  PlanWithFeatures,
  PlanFeature,
  TenantSubscription,
  TenantSubscriptionWithPlan,
} from './tenant_subscription.types'
import type {
  CreatePlanDTO,
  UpdatePlanDTO,
  CreateFeatureDTO,
  UpdateFeatureDTO,
  AssignSubscriptionDTO,
} from './tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from './tenant_subscription.messages'
import type { SubscriptionPlanStatus } from './tenant_subscription.enums'

export default class TenantSubscriptionService {
  // ============================================================================
  // Plan CRUD Operations
  // ============================================================================

  static async createPlan(data: CreatePlanDTO): Promise<SubscriptionPlan> {
    try {
      // If this plan is set as default, unset other defaults
      if (data.isDefault) {
        await prisma.subscriptionPlan.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
      }

      const plan = await prisma.subscriptionPlan.create({
        data: {
          name: data.name,
          description: data.description,
          monthlyPrice: data.monthlyPrice,
          yearlyPrice: data.yearlyPrice,
          currency: data.currency,
          trialDays: data.trialDays,
          sortOrder: data.sortOrder,
          isDefault: data.isDefault,
          status: data.status,
        },
      })

      return SubscriptionPlanSchema.parse(plan)
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED)
    }
  }

  static async updatePlan(planId: string, data: UpdatePlanDTO): Promise<SubscriptionPlan> {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { planId } })
    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    try {
      // If setting as default, unset other defaults
      if (data.isDefault) {
        await prisma.subscriptionPlan.updateMany({
          where: { isDefault: true, planId: { not: planId } },
          data: { isDefault: false },
        })
      }

      const plan = await prisma.subscriptionPlan.update({
        where: { planId },
        data: {
          name: data.name,
          description: data.description,
          monthlyPrice: data.monthlyPrice,
          yearlyPrice: data.yearlyPrice,
          currency: data.currency,
          trialDays: data.trialDays,
          sortOrder: data.sortOrder,
          isDefault: data.isDefault,
          status: data.status,
        },
      })

      return SubscriptionPlanSchema.parse(plan)
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED)
    }
  }

  static async deletePlan(planId: string): Promise<void> {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { planId },
      include: { subscriptions: { where: { status: 'ACTIVE' }, take: 1 } },
    })

    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    if (existing.subscriptions.length > 0) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_HAS_SUBSCRIPTIONS)
    }

    try {
      await prisma.subscriptionPlan.delete({ where: { planId } })
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED)
    }
  }

  static async getPlans(status?: SubscriptionPlanStatus): Promise<SubscriptionPlan[]> {
    const where: Prisma.SubscriptionPlanWhereInput = {}
    if (status) where.status = status

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    })

    return plans.map((p) => SubscriptionPlanSchema.parse(p))
  }

  static async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { planId } })
    if (!plan) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }
    return SubscriptionPlanSchema.parse(plan)
  }

  static async getPlanWithFeatures(planId: string): Promise<PlanWithFeatures> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { planId },
      include: { features: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!plan) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    return PlanWithFeaturesSchema.parse(plan)
  }

  static async getPlansWithFeatures(status?: SubscriptionPlanStatus): Promise<PlanWithFeatures[]> {
    const where: Prisma.SubscriptionPlanWhereInput = {}
    if (status) where.status = status

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      include: { features: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })

    return plans.map((p) => PlanWithFeaturesSchema.parse(p))
  }

  // ============================================================================
  // Feature CRUD Operations
  // ============================================================================

  static async addFeature(planId: string, data: CreateFeatureDTO): Promise<PlanFeature> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { planId } })
    if (!plan) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    try {
      const feature = await prisma.planFeature.create({
        data: {
          planId,
          key: data.key,
          label: data.label,
          type: data.type,
          value: data.value,
          sortOrder: data.sortOrder,
        },
      })

      return PlanFeatureSchema.parse(feature)
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS)
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED)
    }
  }

  static async updateFeature(featureId: string, data: UpdateFeatureDTO): Promise<PlanFeature> {
    const existing = await prisma.planFeature.findUnique({ where: { featureId } })
    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND)
    }

    try {
      const feature = await prisma.planFeature.update({
        where: { featureId },
        data: {
          key: data.key,
          label: data.label,
          type: data.type,
          value: data.value,
          sortOrder: data.sortOrder,
        },
      })

      return PlanFeatureSchema.parse(feature)
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS)
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED)
    }
  }

  static async removeFeature(featureId: string): Promise<void> {
    const existing = await prisma.planFeature.findUnique({ where: { featureId } })
    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND)
    }

    try {
      await prisma.planFeature.delete({ where: { featureId } })
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED)
    }
  }

  static async getFeaturesByPlan(planId: string): Promise<PlanFeature[]> {
    const features = await prisma.planFeature.findMany({
      where: { planId },
      orderBy: { sortOrder: 'asc' },
    })

    return features.map((f) => PlanFeatureSchema.parse(f))
  }

  // ============================================================================
  // Tenant Subscription Operations
  // ============================================================================

  static async assignPlan(tenantId: string, data: AssignSubscriptionDTO): Promise<TenantSubscription> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { planId: data.planId } })
    if (!plan) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    const now = new Date()
    const periodEnd = new Date(now)
    if (data.billingInterval === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    const trialEndsAt = plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null

    try {
      const subscription = await prisma.tenantSubscription.upsert({
        where: { tenantId },
        update: {
          planId: data.planId,
          billingInterval: data.billingInterval,
          status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt,
          cancelledAt: null,
        },
        create: {
          tenantId,
          planId: data.planId,
          billingInterval: data.billingInterval,
          status: trialEndsAt ? 'TRIALING' : 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt,
        },
      })

      return TenantSubscriptionSchema.parse(subscription)
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED)
    }
  }

  static async getSubscription(tenantId: string): Promise<TenantSubscriptionWithPlan | null> {
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        plan: {
          include: { features: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    })

    if (!subscription) return null

    return TenantSubscriptionWithPlanSchema.parse(subscription)
  }

  static async cancelSubscription(tenantId: string): Promise<TenantSubscription> {
    const existing = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND)
    }

    if (existing.status === 'CANCELLED') {
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ALREADY_CANCELLED)
    }

    try {
      const subscription = await prisma.tenantSubscription.update({
        where: { tenantId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      })

      return TenantSubscriptionSchema.parse(subscription)
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED)
    }
  }
}
