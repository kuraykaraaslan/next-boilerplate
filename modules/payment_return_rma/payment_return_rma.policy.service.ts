import 'reflect-metadata'
import type { EntityManager } from 'typeorm'
import redis, { jitter, singleFlight } from '@/modules/redis'
import { env } from '@/modules/env'
import SettingService from '@/modules/setting/setting.service'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { ReturnRequest as ReturnRequestEntity } from './entities/return_request.entity'
import { PAYMENT_RETURN_RMA_MESSAGES } from './payment_return_rma.messages'

// The return policy is derived from ~8 tenant settings and read on every return
// create/quote, yet changes only when an admin edits the policy. Consolidate it
// into one cached object. Settings are edited through the generic SettingService
// (no local write hook here), so freshness is bounded by TTL rather than explicit
// invalidation — a short window of stale policy is acceptable for returns.
const POLICY_CACHE_TTL = env.TENANT_CACHE_TTL ?? (60 * 5)

function policyCacheKey(tenantId: string): string {
  return `payment_return_rma:policy:${tenantId}`
}

export interface ReturnPolicy {
  windowDays: number          // 0 = no window enforcement
  rmaPrefix: string
  rmaPadding: number
  autoApprove: boolean
  restockingFeePercent: number
  slaHours: number
  defaultRefundMethod: string // CASH | STORE_CREDIT | GIFT_CARD
  exchangesAllowed: boolean
}

export default class PaymentReturnRmaPolicyService {
  /** Per-tenant return policy from settings, with sensible defaults. */
  static async getPolicy(tenantId: string): Promise<ReturnPolicy> {
    const key = policyCacheKey(tenantId)
    const cached = await redis.get(key).catch(() => null)
    if (cached) {
      try { return JSON.parse(cached) as ReturnPolicy } catch { await redis.del(key).catch(() => {}) }
    }

    return singleFlight(key, async () => {
      const s = await SettingService.getByKeys(tenantId, [
        'returnWindowDays', 'rmaNumberPrefix', 'rmaNumberPadding', 'returnAutoApprove',
        'restockingFeePercent', 'returnSlaHours', 'returnDefaultRefundMethod', 'returnExchangesAllowed',
      ]).catch(() => ({} as Record<string, string | null>))
      const num = (v: string | null | undefined, d: number) => {
        const n = parseInt(v ?? '', 10); return Number.isFinite(n) && n >= 0 ? n : d
      }
      const policy: ReturnPolicy = {
        windowDays: num(s.returnWindowDays, 30),
        rmaPrefix: (s.rmaNumberPrefix || 'RMA').toUpperCase(),
        rmaPadding: num(s.rmaNumberPadding, 6),
        autoApprove: s.returnAutoApprove === 'true',
        restockingFeePercent: num(s.restockingFeePercent, 0),
        slaHours: num(s.returnSlaHours, 72),
        defaultRefundMethod: (s.returnDefaultRefundMethod || 'CASH').toUpperCase(),
        exchangesAllowed: s.returnExchangesAllowed !== 'false',
      }
      await redis.setex(key, jitter(POLICY_CACHE_TTL), JSON.stringify(policy)).catch(() => {})
      return policy
    })
  }

  /** Evict the cached return policy (call after editing return settings). */
  static async invalidatePolicy(tenantId: string): Promise<void> {
    await redis.del(policyCacheKey(tenantId)).catch(() => {})
  }

  /**
   * Eligibility at create time: enforce the return window against the purchase
   * date and block exchanges when the tenant disallows them. `purchasedAt` is
   * caller-supplied (from the order/payment); skipped when unknown.
   */
  static assertEligible(policy: ReturnPolicy, params: { type: string; purchasedAt?: Date | null }): void {
    if (params.type === 'EXCHANGE' && !policy.exchangesAllowed) {
      throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.EXCHANGES_NOT_ALLOWED, 422, ErrorCode.VALIDATION_ERROR)
    }
    if (policy.windowDays > 0 && params.purchasedAt) {
      const ageDays = (Date.now() - new Date(params.purchasedAt).getTime()) / 86_400_000
      if (ageDays > policy.windowDays) {
        throw new AppError(PAYMENT_RETURN_RMA_MESSAGES.RETURN_WINDOW_EXPIRED, 422, ErrorCode.VALIDATION_ERROR)
      }
    }
  }

  /**
   * Auto-approval: when enabled, approve immediately if every returned item is
   * in resellable condition (UNOPENED/DEFECTIVE accepted; USED/DAMAGED need
   * manual review).
   */
  static shouldAutoApprove(policy: ReturnPolicy, itemConditions: Array<string | null | undefined>): boolean {
    if (!policy.autoApprove) return false
    const acceptable = new Set(['UNOPENED', 'DEFECTIVE'])
    return itemConditions.every((c) => !c || acceptable.has(c))
  }

  static restockingFee(policy: ReturnPolicy, refundAmount: number): number {
    if (policy.restockingFeePercent <= 0) return 0
    return Math.round(refundAmount * (policy.restockingFeePercent / 100) * 100) / 100
  }

  static slaDueAt(policy: ReturnPolicy, from: Date = new Date()): Date {
    return new Date(from.getTime() + policy.slaHours * 60 * 60 * 1000)
  }

  /**
   * Allocate a gap-free sequential RMA number for `(tenant, prefix, year)`.
   * MUST run inside the create transaction (advisory lock serialises concurrent
   * creates so two returns can't collide on the same number).
   */
  static async allocateRmaNumber(manager: EntityManager, tenantId: string, prefix: string, padding: number): Promise<string> {
    const year = new Date().getUTCFullYear()
    const search = `${prefix}-${year}-`
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [`rma:${tenantId}:${search}`])
    const row = await manager.getRepository(ReturnRequestEntity).createQueryBuilder('r')
      .select('r.rmaNumber', 'rmaNumber')
      .where('r.tenantId = :tid', { tid: tenantId })
      .andWhere('r.rmaNumber LIKE :p', { p: `${search}%` })
      .orderBy('LENGTH(r.rmaNumber)', 'DESC')
      .addOrderBy('r.rmaNumber', 'DESC')
      .limit(1)
      .getRawOne<{ rmaNumber: string }>()
    const last = row?.rmaNumber ? parseInt(row.rmaNumber.split('-').pop() ?? '0', 10) : 0
    return `${search}${(last + 1).toString().padStart(padding, '0')}`
  }
}
