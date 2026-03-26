import { systemPrisma, tenantPrisma, tenantPrismaFor } from '@/libs/prisma'
import type { Prisma as SystemPrisma } from '@/prisma/system/client'
import Logger from '@/libs/logger'
import redis from '@/libs/redis'
import PaymentService from '@/modules/payment/payment.service'
import type { PaymentProvider, PaymentCurrency } from '@/modules/payment/payment.enums'
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
  FeatureAccessResult,
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
        await systemPrisma.subscriptionPlan.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
      }

      const plan = await systemPrisma.subscriptionPlan.create({
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
    const existing = await systemPrisma.subscriptionPlan.findUnique({ where: { planId } })
    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    try {
      // If setting as default, unset other defaults
      if (data.isDefault) {
        await systemPrisma.subscriptionPlan.updateMany({
          where: { isDefault: true, planId: { not: planId } },
          data: { isDefault: false },
        })
      }

      const plan = await systemPrisma.subscriptionPlan.update({
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
    const existing = await systemPrisma.subscriptionPlan.findUnique({ where: { planId } })

    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    // Cross-DB: check active subscriptions in tenant DB
    const activeCount = await tenantPrisma.tenantSubscription.count({
      where: { planId, status: 'ACTIVE' },
    })

    if (activeCount > 0) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_HAS_SUBSCRIPTIONS)
    }

    try {
      await systemPrisma.subscriptionPlan.delete({ where: { planId } })
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED)
    }
  }

  static async getPlans(status?: SubscriptionPlanStatus): Promise<SubscriptionPlan[]> {
    const where: SystemPrisma.SubscriptionPlanWhereInput = {}
    if (status) where.status = status

    const plans = await systemPrisma.subscriptionPlan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    })

    return plans.map((p) => SubscriptionPlanSchema.parse(p))
  }

  static async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const plan = await systemPrisma.subscriptionPlan.findUnique({ where: { planId } })
    if (!plan) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }
    return SubscriptionPlanSchema.parse(plan)
  }

  static async getPlanWithFeatures(planId: string): Promise<PlanWithFeatures> {
    const plan = await systemPrisma.subscriptionPlan.findUnique({
      where: { planId },
      include: { features: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!plan) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    return PlanWithFeaturesSchema.parse(plan)
  }

  static async getPlansWithFeatures(status?: SubscriptionPlanStatus): Promise<PlanWithFeatures[]> {
    const where: SystemPrisma.SubscriptionPlanWhereInput = {}
    if (status) where.status = status

    const plans = await systemPrisma.subscriptionPlan.findMany({
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
    const plan = await systemPrisma.subscriptionPlan.findUnique({ where: { planId } })
    if (!plan) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    try {
      const feature = await systemPrisma.planFeature.create({
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
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS)
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED)
    }
  }

  static async updateFeature(featureId: string, data: UpdateFeatureDTO): Promise<PlanFeature> {
    const existing = await systemPrisma.planFeature.findUnique({ where: { featureId } })
    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND)
    }

    try {
      const feature = await systemPrisma.planFeature.update({
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
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_KEY_EXISTS)
      }
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED)
    }
  }

  static async removeFeature(featureId: string): Promise<void> {
    const existing = await systemPrisma.planFeature.findUnique({ where: { featureId } })
    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_NOT_FOUND)
    }

    try {
      await systemPrisma.planFeature.delete({ where: { featureId } })
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED)
    }
  }

  static async getFeaturesByPlan(planId: string): Promise<PlanFeature[]> {
    const features = await systemPrisma.planFeature.findMany({
      where: { planId },
      orderBy: { sortOrder: 'asc' },
    })

    return features.map((f) => PlanFeatureSchema.parse(f))
  }

  // ============================================================================
  // Tenant Subscription Operations
  // ============================================================================

  static async assignPlan(tenantId: string, data: AssignSubscriptionDTO): Promise<TenantSubscription> {
    const plan = await systemPrisma.subscriptionPlan.findUnique({ where: { planId: data.planId } })
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
      const db = await tenantPrismaFor(tenantId);
      const subscription = await db.tenantSubscription.upsert({
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

      await this.invalidateFeatureCache(tenantId)
      return TenantSubscriptionSchema.parse(subscription)
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED)
    }
  }

  static async getSubscription(tenantId: string): Promise<TenantSubscriptionWithPlan | null> {
    const db = await tenantPrismaFor(tenantId);
    const subscription = await db.tenantSubscription.findUnique({ where: { tenantId } })
    if (!subscription) return null

    // Cross-DB: fetch plan + features from system DB
    const plan = await systemPrisma.subscriptionPlan.findUnique({
      where: { planId: subscription.planId },
      include: { features: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!plan) return null

    return TenantSubscriptionWithPlanSchema.parse({ ...subscription, plan })
  }

  static async cancelSubscription(tenantId: string): Promise<TenantSubscription> {
    const db = await tenantPrismaFor(tenantId);
    const existing = await db.tenantSubscription.findUnique({ where: { tenantId } })
    if (!existing) {
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_NOT_FOUND)
    }

    if (existing.status === 'CANCELLED') {
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ALREADY_CANCELLED)
    }

    try {
      const subscription = await db.tenantSubscription.update({
        where: { tenantId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      })

      await this.invalidateFeatureCache(tenantId)
      return TenantSubscriptionSchema.parse(subscription)
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED)
    }
  }

  // ============================================================================
  // Payment Integration
  // ============================================================================

  static async purchaseSubscription(params: {
    tenantId: string
    planId: string
    billingInterval: 'MONTHLY' | 'YEARLY'
    successUrl: string
    cancelUrl: string
    provider?: PaymentProvider
    customerEmail?: string
    customerName?: string
  }): Promise<{ paymentId: string; checkoutUrl: string }> {
    const { tenantId, planId, billingInterval, successUrl, cancelUrl, provider, customerEmail, customerName } = params

    // Get plan details
    const plan = await systemPrisma.subscriptionPlan.findUnique({ where: { planId } })
    if (!plan) {
      throw new Error(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND)
    }

    // Calculate amount based on billing interval
    const amount = billingInterval === 'MONTHLY'
      ? Number(plan.monthlyPrice)
      : Number(plan.yearlyPrice)

    const currency = plan.currency as PaymentCurrency

    try {
      // Create payment record
      const payment = await PaymentService.create({
        tenantId,
        provider: provider || 'STRIPE',
        amount,
        currency,
        description: `${plan.name} Subscription - ${billingInterval === 'MONTHLY' ? 'Monthly' : 'Yearly'}`,
        customerEmail,
        customerName,
        metadata: {
          type: 'subscription',
          planId,
          billingInterval,
          tenantId,
        },
      })

      // Create checkout session with provider
      const checkout = await PaymentService.createCheckoutSession(
        {
          amount,
          currency,
          description: `${plan.name} Subscription`,
          successUrl: `${successUrl}?paymentId=${payment.paymentId}`,
          cancelUrl,
          metadata: {
            paymentId: payment.paymentId,
            planId,
            tenantId,
            billingInterval,
          },
        },
        provider
      )

      // Update payment with provider session ID
      await PaymentService.update(payment.paymentId, {
        providerPaymentId: checkout.sessionId,
        metadata: {
          ...(payment.metadata as object || {}),
          checkoutSessionId: checkout.sessionId,
        },
      })

      return {
        paymentId: payment.paymentId,
        checkoutUrl: checkout.checkoutUrl,
      }
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED)
    }
  }

  // ============================================================================
  // Feature Gating — Redis cache + AuditLog
  // ============================================================================

  private static readonly FEATURE_CACHE_PREFIX = 'feature:sub:'
  private static readonly FEATURE_CACHE_TTL = 300 // seconds

  /** Serialisable shape stored in Redis — only the fields needed for gating. */
  private static featureCacheKey(tenantId: string): string {
    return `${this.FEATURE_CACHE_PREFIX}${tenantId}`
  }

  private static async getFeatureCache(tenantId: string): Promise<{
    status: string
    features: Array<{ key: string; type: string; value: string }>
  } | null> {
    try {
      const raw = await redis.get(this.featureCacheKey(tenantId))
      return raw ? JSON.parse(raw) : null
    } catch {
      return null // cache miss on any Redis error — fall through to DB
    }
  }

  private static async setFeatureCache(
    tenantId: string,
    status: string,
    features: Array<{ key: string; type: string; value: string }>,
  ): Promise<void> {
    try {
      await redis.set(
        this.featureCacheKey(tenantId),
        JSON.stringify({ status, features }),
        'EX',
        this.FEATURE_CACHE_TTL,
      )
    } catch (err) {
      Logger.warn(`Feature cache set failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** Call after assignPlan / cancelSubscription so stale cache is evicted. */
  static async invalidateFeatureCache(tenantId: string): Promise<void> {
    try {
      await redis.del(this.featureCacheKey(tenantId))
    } catch (err) {
      Logger.warn(`Feature cache invalidation failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** Fire-and-forget write to AuditLog — never blocks the caller. */
  private static logFeatureAccess(tenantId: string, result: FeatureAccessResult): void {
    tenantPrismaFor(tenantId).then(db => db.auditLog.create({
      data: {
        tenantId,
        actorType: 'SYSTEM',
        action: 'feature.access.checked',
        resourceType: 'PlanFeature',
        resourceId: result.featureKey,
        metadata: result as object,
      },
    })).catch((err) =>
      Logger.error(`Feature access audit log failed: ${err instanceof Error ? err.message : String(err)}`)
    )
  }

  /**
   * Check whether a tenant has access to a specific plan feature.
   *
   * Flow: Redis cache → DB (+ re-populate cache) → compute result → AuditLog (async)
   *
   * - BOOLEAN feature: `allowed` is true when the feature value is `"true"`.
   * - LIMIT feature: `allowed` is true when `currentCount < limit` (or unlimited).
   *   Omit `currentCount` to retrieve limit metadata without an access decision.
   *
   * Returns `allowed: false` when the tenant has no active subscription or the
   * feature key is not present on their plan.
   */
  static async checkFeatureAccess(
    tenantId: string,
    featureKey: string,
    currentCount?: number,
    options?: { gracePercent?: number },
  ): Promise<FeatureAccessResult> {
    const ACTIVE_STATUSES = ['ACTIVE', 'TRIALING']

    const DENIED_BOOLEAN: FeatureAccessResult = {
      allowed: false,
      featureKey,
      type: 'BOOLEAN',
      limit: null,
      unlimited: null,
      current: null,
    }

    try {
      // 1. Redis cache lookup
      let cached = await this.getFeatureCache(tenantId)

      if (!cached) {
        // 2. Cache miss → two DB queries (subscription from tenant DB, features from system DB)
        const db = await tenantPrismaFor(tenantId);
        const sub = await db.tenantSubscription.findUnique({ where: { tenantId } })

        if (!sub) {
          this.logFeatureAccess(tenantId, DENIED_BOOLEAN)
          return DENIED_BOOLEAN
        }

        const plan = await systemPrisma.subscriptionPlan.findUnique({
          where: { planId: sub.planId },
          include: { features: { select: { key: true, type: true, value: true } } },
        })
        const features = plan?.features ?? []

        // 3. Populate cache for next calls
        await this.setFeatureCache(tenantId, sub.status, features)
        cached = { status: sub.status, features }
      }

      // 4. Subscription status check
      if (!ACTIVE_STATUSES.includes(cached.status)) {
        this.logFeatureAccess(tenantId, DENIED_BOOLEAN)
        return DENIED_BOOLEAN
      }

      // 5. Feature lookup
      const feature = cached.features.find((f) => f.key === featureKey)
      if (!feature) {
        this.logFeatureAccess(tenantId, DENIED_BOOLEAN)
        return DENIED_BOOLEAN
      }

      // 6. Compute result
      let result: FeatureAccessResult

      if (feature.type === 'BOOLEAN') {
        result = {
          allowed: feature.value === 'true',
          featureKey,
          type: 'BOOLEAN',
          limit: null,
          unlimited: null,
          current: null,
        }
      } else {
        const gracePercent = options?.gracePercent ?? 0
        const limit = parseInt(feature.value, 10)
        const unlimited = limit === -1
        const current = currentCount ?? null
        const graceCeiling = unlimited ? -1 : limit + Math.floor(limit * gracePercent / 100)
        const inGrace = !unlimited && current !== null && current >= limit && current < graceCeiling
        const allowed = currentCount !== undefined
          ? unlimited || currentCount < graceCeiling
          : true // caller uses `limit`/`effectiveLimit` to decide
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
        }
      }

      // 7. Fire-and-forget audit log
      this.logFeatureAccess(tenantId, result)

      return result
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.FEATURE_CHECK_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw new Error(SUBSCRIPTION_MESSAGES.FEATURE_CHECK_FAILED)
    }
  }

  /**
   * Like `checkFeatureAccess` but throws if access is denied.
   * Use this directly in API routes or service calls that should hard-fail.
   */
  static async assertFeatureAccess(
    tenantId: string,
    featureKey: string,
    currentCount?: number,
    options?: { gracePercent?: number },
  ): Promise<FeatureAccessResult> {
    const result = await this.checkFeatureAccess(tenantId, featureKey, currentCount, options)

    if (!result.allowed) {
      const message = result.type === 'LIMIT'
        ? SUBSCRIPTION_MESSAGES.FEATURE_LIMIT_REACHED
        : SUBSCRIPTION_MESSAGES.FEATURE_ACCESS_DENIED
      throw new Error(message)
    }

    return result
  }

  static async confirmPayment(paymentId: string): Promise<TenantSubscription> {
    try {
      // Get payment record
      const payment = await PaymentService.getById(paymentId)
      
      if (!payment) {
        throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_NOT_FOUND)
      }

      if (payment.status === 'COMPLETED') {
        // Already processed - return existing subscription
        const existing = await this.getSubscription(payment.tenantId!)
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
          })
        }
        throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_ALREADY_PROCESSED)
      }

      if (payment.status !== 'PENDING' && payment.status !== 'PROCESSING') {
        throw new Error(SUBSCRIPTION_MESSAGES.PAYMENT_INVALID_STATUS)
      }

      // Extract metadata
      const metadata = payment.metadata as { planId?: string; billingInterval?: string; tenantId?: string } || {}
      const { planId, billingInterval, tenantId } = metadata

      if (!planId || !billingInterval || !tenantId) {
        throw new Error(SUBSCRIPTION_MESSAGES.INVALID_REQUEST)
      }

      // Mark payment as completed
      await PaymentService.markAsCompleted(paymentId)

      // Assign the subscription
      const subscription = await this.assignPlan(tenantId, {
        planId,
        billingInterval: billingInterval as 'MONTHLY' | 'YEARLY',
      })

      return subscription
    } catch (error) {
      Logger.error(`${SUBSCRIPTION_MESSAGES.PAYMENT_CONFIRMATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
}
