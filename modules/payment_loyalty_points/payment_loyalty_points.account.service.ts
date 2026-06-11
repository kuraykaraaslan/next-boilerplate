import 'reflect-metadata'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import { AppError, ErrorCode } from '@/modules/common/app-error'
import { LoyaltyAccount as LoyaltyAccountEntity } from './entities/loyalty_account.entity'
import { LoyaltyTier as LoyaltyTierEntity } from './entities/loyalty_tier.entity'
import {
  LoyaltyAccountSchema, LoyaltyTierSchema, LoyaltyAccountWithTierSchema,
  type LoyaltyAccount, type LoyaltyTier, type LoyaltyAccountWithTier,
} from './payment_loyalty_points.types'
import type { CreateTierDTO, UpdateTierDTO } from './payment_loyalty_points.dto'
import { PAYMENT_LOYALTY_POINTS_MESSAGES } from './payment_loyalty_points.messages'

const DEFAULT_TIER = 'BRONZE'

export default class PaymentLoyaltyPointsAccountService {

  static userCacheKey(userId: string): string {
    return `loyalty:user:${userId}`
  }

  static accountCacheKey(accountId: string): string {
    return `loyalty:${accountId}`
  }

  static async bustCache(userId: string, accountId: string): Promise<void> {
    await redis.del(PaymentLoyaltyPointsAccountService.userCacheKey(userId)).catch(() => {})
    await redis.del(PaymentLoyaltyPointsAccountService.accountCacheKey(accountId)).catch(() => {})
  }

  // ──────────────────────────────────────────────
  // Accounts
  // ──────────────────────────────────────────────

  static async getOrCreateAccount(tenantId: string, userId: string): Promise<LoyaltyAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LoyaltyAccountEntity)
    let row = await repo.findOne({ where: { tenantId, userId } })
    if (!row) {
      row = await repo.save(repo.create({ tenantId, userId, balance: 0, lifetimePoints: 0, tier: DEFAULT_TIER }))
    }
    return LoyaltyAccountSchema.parse(row)
  }

  static async getAccount(tenantId: string, userId: string): Promise<LoyaltyAccountWithTier> {
    return singleFlight(PaymentLoyaltyPointsAccountService.userCacheKey(userId), async () => {
      const account = await PaymentLoyaltyPointsAccountService.getOrCreateAccount(tenantId, userId)
      const ds = await tenantDataSourceFor(tenantId)
      const tierRow = await ds.getRepository(LoyaltyTierEntity).findOne({
        where: { tenantId, code: account.tier },
      })
      return LoyaltyAccountWithTierSchema.parse({
        ...account,
        tierDetail: tierRow ? LoyaltyTierSchema.parse(tierRow) : null,
      })
    })
  }

  static async getBalance(tenantId: string, userId: string): Promise<number> {
    const account = await PaymentLoyaltyPointsAccountService.getOrCreateAccount(tenantId, userId)
    return account.balance
  }

  // ──────────────────────────────────────────────
  // Tiers
  // ──────────────────────────────────────────────

  static async createTier(tenantId: string, dto: CreateTierDTO): Promise<LoyaltyTier> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LoyaltyTierEntity)
    const existing = await repo.findOne({ where: { tenantId, code: dto.code } })
    if (existing) throw new AppError(PAYMENT_LOYALTY_POINTS_MESSAGES.TIER_CODE_EXISTS, 409, ErrorCode.CONFLICT)
    const saved = await repo.save(repo.create({ ...dto, tenantId }))
    return LoyaltyTierSchema.parse(saved)
  }

  static async updateTier(tenantId: string, tierId: string, dto: UpdateTierDTO): Promise<LoyaltyTier> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LoyaltyTierEntity)
    const row = await repo.findOne({ where: { tenantId, loyaltyTierId: tierId } })
    if (!row) throw new AppError(PAYMENT_LOYALTY_POINTS_MESSAGES.TIER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
    Object.assign(row, dto)
    const saved = await repo.save(row)
    return LoyaltyTierSchema.parse(saved)
  }

  static async listTiers(tenantId: string): Promise<LoyaltyTier[]> {
    const ds = await tenantDataSourceFor(tenantId)
    const rows = await ds.getRepository(LoyaltyTierEntity).find({
      where: { tenantId },
      order: { minPoints: 'ASC' },
    })
    return rows.map((r) => LoyaltyTierSchema.parse(r))
  }
}
