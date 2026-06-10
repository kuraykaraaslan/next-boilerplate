import 'reflect-metadata'
import { LessThanOrEqual, type EntityManager } from 'typeorm'
import { tenantDataSourceFor } from '@/modules/db'
import redis, { singleFlight } from '@/modules/redis'
import Logger from '@/modules/logger'
import { LoyaltyAccount as LoyaltyAccountEntity } from './entities/loyalty_account.entity'
import { LoyaltyTransaction as LoyaltyTransactionEntity } from './entities/loyalty_transaction.entity'
import { LoyaltyTier as LoyaltyTierEntity } from './entities/loyalty_tier.entity'
import {
  LoyaltyAccountSchema, LoyaltyTransactionSchema, LoyaltyTierSchema, LoyaltyAccountWithTierSchema,
  type LoyaltyAccount, type LoyaltyTransaction, type LoyaltyTier, type LoyaltyAccountWithTier,
} from './payment_loyalty_points.types'
import type {
  EarnPointsDTO, RedeemPointsDTO, AdjustPointsDTO, GetTransactionsQuery,
  CreateTierDTO, UpdateTierDTO,
} from './payment_loyalty_points.dto'
import { PAYMENT_LOYALTY_POINTS_MESSAGES } from './payment_loyalty_points.messages'
import { AppError, ErrorCode } from '@/modules/common/app-error'

const DEFAULT_TIER = 'BRONZE'

export default class PaymentLoyaltyPointsService {

  // ============================================================================
  // Cache keys
  // ============================================================================

  private static userCacheKey(userId: string): string {
    return `loyalty:user:${userId}`
  }

  private static accountCacheKey(accountId: string): string {
    return `loyalty:${accountId}`
  }

  private static async bustCache(userId: string, accountId: string): Promise<void> {
    await redis.del(PaymentLoyaltyPointsService.userCacheKey(userId)).catch(() => {})
    await redis.del(PaymentLoyaltyPointsService.accountCacheKey(accountId)).catch(() => {})
  }

  // ============================================================================
  // Accounts
  // ============================================================================

  static async getOrCreateAccount(tenantId: string, userId: string): Promise<LoyaltyAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    const repo = ds.getRepository(LoyaltyAccountEntity)
    let row = await repo.findOne({ where: { tenantId, userId } })
    if (!row) {
      row = await repo.save(repo.create({
        tenantId,
        userId,
        balance: 0,
        lifetimePoints: 0,
        tier: DEFAULT_TIER,
      }))
    }
    return LoyaltyAccountSchema.parse(row)
  }

  static async getAccount(tenantId: string, userId: string): Promise<LoyaltyAccountWithTier> {
    return singleFlight(PaymentLoyaltyPointsService.userCacheKey(userId), async () => {
      const account = await PaymentLoyaltyPointsService.getOrCreateAccount(tenantId, userId)
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
    const account = await PaymentLoyaltyPointsService.getOrCreateAccount(tenantId, userId)
    return account.balance
  }

  // ============================================================================
  // Earn / Redeem / Adjust
  // ============================================================================

  static async earn(tenantId: string, dto: EarnPointsDTO): Promise<LoyaltyAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    let accountId = ''
    try {
      const saved = await ds.transaction(async (manager: EntityManager) => {
        const accountRepo = manager.getRepository(LoyaltyAccountEntity)
        const txRepo = manager.getRepository(LoyaltyTransactionEntity)

        let account = await accountRepo.findOne({ where: { tenantId, userId: dto.userId } })
        if (!account) {
          account = await accountRepo.save(accountRepo.create({
            tenantId,
            userId: dto.userId,
            balance: 0,
            lifetimePoints: 0,
            tier: DEFAULT_TIER,
          }))
        }
        accountId = account.loyaltyAccountId

        let points = dto.points
        if (dto.applyMultiplier) {
          const tierRow = await manager.getRepository(LoyaltyTierEntity).findOne({
            where: { tenantId, code: account.tier },
          })
          const multiplier = tierRow ? Number(tierRow.multiplier) : 1
          points = Math.round(dto.points * multiplier)
        }

        account.balance += points
        account.lifetimePoints += points
        const savedAccount = await accountRepo.save(account)

        let expiresAt: Date | undefined
        if (dto.expiresInDays) {
          expiresAt = new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
        }

        await txRepo.save(txRepo.create({
          tenantId,
          accountId: savedAccount.loyaltyAccountId,
          userId: dto.userId,
          type: 'EARN',
          points,
          reason: dto.reason,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          balanceAfter: savedAccount.balance,
          expiresAt,
        }))

        return PaymentLoyaltyPointsService.recomputeTierTx(manager, tenantId, savedAccount.loyaltyAccountId)
      })
      await PaymentLoyaltyPointsService.bustCache(dto.userId, accountId)
      return LoyaltyAccountSchema.parse(saved)
    } catch (error) {
      Logger.error(`${PAYMENT_LOYALTY_POINTS_MESSAGES.EARN_FAILED}: ${error}`)
      throw error
    }
  }

  static async redeem(tenantId: string, dto: RedeemPointsDTO): Promise<LoyaltyAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    let accountId = ''
    try {
      const saved = await ds.transaction(async (manager: EntityManager) => {
        const accountRepo = manager.getRepository(LoyaltyAccountEntity)
        const txRepo = manager.getRepository(LoyaltyTransactionEntity)

        const account = await accountRepo.findOne({ where: { tenantId, userId: dto.userId } })
        if (!account) throw new AppError(PAYMENT_LOYALTY_POINTS_MESSAGES.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)
        if (account.balance < dto.points) throw new AppError(PAYMENT_LOYALTY_POINTS_MESSAGES.INSUFFICIENT_POINTS, 409, ErrorCode.CONFLICT)
        accountId = account.loyaltyAccountId

        account.balance -= dto.points
        const savedAccount = await accountRepo.save(account)

        await txRepo.save(txRepo.create({
          tenantId,
          accountId: savedAccount.loyaltyAccountId,
          userId: dto.userId,
          type: 'REDEEM',
          points: -dto.points,
          reason: dto.reason,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          balanceAfter: savedAccount.balance,
        }))

        return savedAccount
      })
      await PaymentLoyaltyPointsService.bustCache(dto.userId, accountId)
      return LoyaltyAccountSchema.parse(saved)
    } catch (error) {
      if (error instanceof AppError) throw error
      Logger.error(`${PAYMENT_LOYALTY_POINTS_MESSAGES.REDEEM_FAILED}: ${error}`)
      throw error
    }
  }

  static async adjust(tenantId: string, dto: AdjustPointsDTO): Promise<LoyaltyAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    let accountId = ''
    try {
      const saved = await ds.transaction(async (manager: EntityManager) => {
        const accountRepo = manager.getRepository(LoyaltyAccountEntity)
        const txRepo = manager.getRepository(LoyaltyTransactionEntity)

        let account = await accountRepo.findOne({ where: { tenantId, userId: dto.userId } })
        if (!account) {
          account = await accountRepo.save(accountRepo.create({
            tenantId,
            userId: dto.userId,
            balance: 0,
            lifetimePoints: 0,
            tier: DEFAULT_TIER,
          }))
        }
        accountId = account.loyaltyAccountId

        // Floor balance at 0 for negative adjustments
        account.balance = Math.max(0, account.balance + dto.points)
        // Positive adjustments also accrue toward lifetime/tier
        if (dto.points > 0) account.lifetimePoints += dto.points
        const savedAccount = await accountRepo.save(account)

        await txRepo.save(txRepo.create({
          tenantId,
          accountId: savedAccount.loyaltyAccountId,
          userId: dto.userId,
          type: 'ADJUST',
          points: dto.points,
          reason: dto.reason,
          balanceAfter: savedAccount.balance,
        }))

        return PaymentLoyaltyPointsService.recomputeTierTx(manager, tenantId, savedAccount.loyaltyAccountId)
      })
      await PaymentLoyaltyPointsService.bustCache(dto.userId, accountId)
      return LoyaltyAccountSchema.parse(saved)
    } catch (error) {
      Logger.error(`${PAYMENT_LOYALTY_POINTS_MESSAGES.ADJUST_FAILED}: ${error}`)
      throw error
    }
  }

  // ============================================================================
  // Transactions
  // ============================================================================

  static async listTransactions(
    tenantId: string, query: GetTransactionsQuery,
  ): Promise<{ data: LoyaltyTransaction[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (query.userId) where['userId'] = query.userId
    if (query.accountId) where['accountId'] = query.accountId
    if (query.type) where['type'] = query.type
    const [rows, total] = await ds.getRepository(LoyaltyTransactionEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    })
    return { data: rows.map((r) => LoyaltyTransactionSchema.parse(r)), total }
  }

  // ============================================================================
  // Tiers
  // ============================================================================

  /** Pick the highest active tier whose minPoints <= lifetimePoints (inside a tx). */
  private static async recomputeTierTx(
    manager: EntityManager, tenantId: string, accountId: string,
  ): Promise<LoyaltyAccountEntity> {
    const accountRepo = manager.getRepository(LoyaltyAccountEntity)
    const account = await accountRepo.findOne({ where: { tenantId, loyaltyAccountId: accountId } })
    if (!account) throw new AppError(PAYMENT_LOYALTY_POINTS_MESSAGES.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)

    const tiers = await manager.getRepository(LoyaltyTierEntity).find({
      where: { tenantId, isActive: true },
      order: { minPoints: 'DESC' },
    })
    const matched = tiers.find((t) => t.minPoints <= account.lifetimePoints)
    const nextCode = matched ? matched.code : DEFAULT_TIER
    if (account.tier !== nextCode) {
      account.tier = nextCode
      return accountRepo.save(account)
    }
    return account
  }

  static async recomputeTier(tenantId: string, accountId: string): Promise<LoyaltyAccount> {
    const ds = await tenantDataSourceFor(tenantId)
    const saved = await ds.transaction((manager: EntityManager) =>
      PaymentLoyaltyPointsService.recomputeTierTx(manager, tenantId, accountId),
    )
    await PaymentLoyaltyPointsService.bustCache(saved.userId, saved.loyaltyAccountId)
    return LoyaltyAccountSchema.parse(saved)
  }

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

  // ============================================================================
  // Expiry
  // ============================================================================

  static async expirePoints(tenantId: string): Promise<number> {
    // NOTE: simple expiry — production may need lot-based tracking
    const ds = await tenantDataSourceFor(tenantId)
    try {
      return await ds.transaction(async (manager: EntityManager) => {
        const txRepo = manager.getRepository(LoyaltyTransactionEntity)
        const accountRepo = manager.getRepository(LoyaltyAccountEntity)

        const now = new Date()
        const expiredLots = await txRepo.find({
          where: { tenantId, type: 'EARN', expiresAt: LessThanOrEqual(now) },
          order: { createdAt: 'ASC' },
        })

        let processed = 0
        for (const lot of expiredLots) {
          const account = await accountRepo.findOne({
            where: { tenantId, loyaltyAccountId: lot.accountId },
          })
          if (!account) continue

          const toExpire = Math.min(account.balance, lot.points)
          if (toExpire <= 0) {
            // Mark as processed so we don't scan it again
            lot.expiresAt = undefined
            await txRepo.save(lot)
            continue
          }

          account.balance -= toExpire
          const savedAccount = await accountRepo.save(account)

          await txRepo.save(txRepo.create({
            tenantId,
            accountId: account.loyaltyAccountId,
            userId: account.userId,
            type: 'EXPIRE',
            points: -toExpire,
            reason: PAYMENT_LOYALTY_POINTS_MESSAGES.POINTS_EXPIRED_REASON,
            referenceType: 'loyalty_transaction',
            referenceId: lot.loyaltyTransactionId,
            balanceAfter: savedAccount.balance,
          }))

          // Clear the lot's expiry so it isn't double-counted on the next run
          lot.expiresAt = undefined
          await txRepo.save(lot)
          processed += 1
        }
        return processed
      })
    } catch (error) {
      Logger.error(`${PAYMENT_LOYALTY_POINTS_MESSAGES.EXPIRE_FAILED}: ${error}`)
      throw error
    }
  }
}
