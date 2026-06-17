import 'reflect-metadata'
import { tenantDataSourceFor } from '@kuraykaraaslan/db'
import SettingService from '@kuraykaraaslan/setting/server/setting.service'
import Logger from '@kuraykaraaslan/logger'
import { LoyaltyAccount as LoyaltyAccountEntity } from './entities/loyalty_account.entity'
import { LoyaltyTransaction as LoyaltyTransactionEntity } from './entities/loyalty_transaction.entity'
import PaymentLoyaltyPointsLedgerService from './payment_loyalty_points.ledger.service'
import PaymentLoyaltyPointsAccountService from './payment_loyalty_points.account.service'
import type { LoyaltyAccount } from './payment_loyalty_points.types'

export interface LoyaltyConfig {
  /** Points earned per 1.0 unit of order currency. */
  earnRate: number
  /** Default tier code for new accounts. */
  defaultTier: string
  /** Default earn-lot expiry in days (0 = never). */
  defaultExpiryDays: number
  /** Whether tier multipliers apply to earned points. */
  multiplierEnabled: boolean
  /** Currency value of a single point at redemption (e.g. 0.01 = 1¢/point). */
  pointValue: number
  /** Max points redeemable in one transaction (0 = unlimited). */
  maxRedeemPerTxn: number
  /** Max % of an order's value payable with points (0 = unlimited). */
  maxRedeemPercent: number
}

/**
 * Per-tenant loyalty configuration + checkout integration. Turns the ledger
 * into a usable revenue feature: earn points from real order totals and redeem
 * them for a real checkout discount, all governed by per-tenant policy.
 */
export default class PaymentLoyaltyPointsCheckoutService {

  static async getConfig(tenantId: string): Promise<LoyaltyConfig> {
    const s = await SettingService.getByKeys(tenantId, [
      'loyaltyEarnRate', 'loyaltyDefaultTier', 'loyaltyDefaultExpiryDays',
      'loyaltyMultiplierEnabled', 'loyaltyPointValue', 'loyaltyMaxRedeemPerTxn', 'loyaltyMaxRedeemPercent',
    ]).catch(() => ({} as Record<string, string | null>))
    const num = (v: string | null | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d }
    return {
      earnRate: num(s.loyaltyEarnRate, 1),
      defaultTier: s.loyaltyDefaultTier || 'BRONZE',
      defaultExpiryDays: num(s.loyaltyDefaultExpiryDays, 0),
      multiplierEnabled: s.loyaltyMultiplierEnabled !== 'false',
      pointValue: num(s.loyaltyPointValue, 0.01),
      maxRedeemPerTxn: num(s.loyaltyMaxRedeemPerTxn, 0),
      maxRedeemPercent: num(s.loyaltyMaxRedeemPercent, 0),
    }
  }

  /** Convert points → order-currency value at the tenant's point value. */
  static async pointsToCurrency(tenantId: string, points: number): Promise<number> {
    const { pointValue } = await this.getConfig(tenantId)
    return Math.round(points * pointValue * 100) / 100
  }

  /** Convert a currency amount → the integer points needed to cover it. */
  static async currencyToPoints(tenantId: string, amount: number): Promise<number> {
    const { pointValue } = await this.getConfig(tenantId)
    if (pointValue <= 0) return 0
    return Math.floor(amount / pointValue)
  }

  /**
   * Earn points from a completed order. Points = floor(orderTotal × earnRate),
   * with the tenant's default expiry + multiplier policy applied.
   */
  static async earnFromOrder(
    tenantId: string,
    dto: { userId: string; orderTotal: number; currency?: string; orderId?: string },
  ): Promise<LoyaltyAccount | null> {
    const cfg = await this.getConfig(tenantId)
    const points = Math.floor(dto.orderTotal * cfg.earnRate)
    if (points <= 0) return null
    return PaymentLoyaltyPointsLedgerService.earn(tenantId, {
      userId: dto.userId, points,
      reason: 'Order purchase',
      referenceType: 'order', referenceId: dto.orderId,
      applyMultiplier: cfg.multiplierEnabled,
      expiresInDays: cfg.defaultExpiryDays > 0 ? cfg.defaultExpiryDays : undefined,
    })
  }

  /**
   * Compute how many points may be redeemed against an order and the resulting
   * discount, honouring per-txn cap, max-percent cap, point value, and the
   * member's available balance.
   */
  static async computeRedemption(
    tenantId: string,
    dto: { userId: string; orderTotal: number; requestedPoints: number },
  ): Promise<{ points: number; discount: number }> {
    const cfg = await this.getConfig(tenantId)
    if (cfg.pointValue <= 0 || dto.requestedPoints <= 0) return { points: 0, discount: 0 }

    let points = dto.requestedPoints
    if (cfg.maxRedeemPerTxn > 0) points = Math.min(points, cfg.maxRedeemPerTxn)

    // Cap by max-percent of the order value (converted to points).
    if (cfg.maxRedeemPercent > 0) {
      const maxValue = (dto.orderTotal * cfg.maxRedeemPercent) / 100
      points = Math.min(points, Math.floor(maxValue / cfg.pointValue))
    }
    // Never discount beyond the order total.
    points = Math.min(points, Math.floor(dto.orderTotal / cfg.pointValue))
    // Cap by available balance.
    const balance = await PaymentLoyaltyPointsAccountService.getBalance(tenantId, dto.userId).catch(() => 0)
    points = Math.max(0, Math.min(points, balance))

    return { points, discount: Math.round(points * cfg.pointValue * 100) / 100 }
  }

  /**
   * Redeem points at checkout: computes the allowable redemption, debits the
   * ledger, and returns the discount to apply to the order.
   */
  static async redeemForOrder(
    tenantId: string,
    dto: { userId: string; orderTotal: number; requestedPoints: number; orderId?: string },
  ): Promise<{ pointsUsed: number; discount: number; account: LoyaltyAccount | null }> {
    const { points, discount } = await this.computeRedemption(tenantId, dto)
    if (points <= 0) return { pointsUsed: 0, discount: 0, account: null }
    const account = await PaymentLoyaltyPointsLedgerService.redeem(tenantId, {
      userId: dto.userId, points, reason: 'Checkout redemption',
      referenceType: 'order', referenceId: dto.orderId,
    })
    return { pointsUsed: points, discount, account }
  }

  /**
   * GDPR-compliant deletion of a member's loyalty data: removes the account and
   * its transaction ledger for the user, and busts the cache.
   */
  static async eraseForUser(tenantId: string, userId: string): Promise<void> {
    const ds = await tenantDataSourceFor(tenantId)
    const account = await ds.getRepository(LoyaltyAccountEntity).findOne({ where: { tenantId, userId } })
    await ds.getRepository(LoyaltyTransactionEntity).delete({ tenantId, userId })
    if (account) {
      await ds.getRepository(LoyaltyAccountEntity).delete({ tenantId, userId })
      await PaymentLoyaltyPointsAccountService.bustCache(userId, account.loyaltyAccountId).catch(() => {})
    }
    Logger.info(`[loyalty] erased loyalty data for user ${userId} in tenant ${tenantId}`)
  }
}
