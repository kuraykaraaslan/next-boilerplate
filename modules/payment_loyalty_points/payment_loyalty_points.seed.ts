import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_USER_ID, SEED_ADMIN_USER_ID, SEED_ORDER_ID } from '@/modules/seed/seed.context';
import { LoyaltyTier } from './entities/loyalty_tier.entity';
import { LoyaltyAccount } from './entities/loyalty_account.entity';
import { LoyaltyTransaction } from './entities/loyalty_transaction.entity';

/**
 * Demo seed for the loyalty points program.
 *
 * Mirrors the `store.seed.ts` template:
 *  - every write goes through `ctx.foc(repo, where, create)` with a natural key
 *    (tier `code`, account `tenantId+userId`, ledger `tenantId+accountId+type+referenceId`)
 *    so re-runs reuse rows instead of duplicating them.
 *  - all three entities carry a `tenantId` column → tenant-scoped `ctx.repo(...)`.
 *  - enum-typed `type` uses ONLY values from the LoyaltyTransactionTypeEnum
 *    (EARN | REDEEM | EXPIRE | ADJUST | REVOKE).
 *  - ints are ints, the `multiplier` decimal is a real number (the entity
 *    transformer maps it back to `number`).
 *
 * Story it tells: a tier ladder (Bronze/Silver/Gold), one power user who earned
 * their way to GOLD and redeemed at checkout, and the admin sitting at SILVER
 * after a manual adjustment — plus an expired EARN lot to exercise EXPIRE.
 */
export async function seedPaymentLoyaltyPoints(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  // Cross-module ids: prefer published refs, fall back to the shared constants.
  const userId = (refs.userId as string) ?? SEED_USER_ID;
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;
  const orderId = (refs.orderId as string) ?? SEED_ORDER_ID;

  // ── Tiers (the ladder: Bronze base → Silver → Gold, with earn multipliers) ──
  type TierDef = {
    name: string;
    code: string;
    minPoints: number;
    multiplier: number;
    benefits: Record<string, unknown>;
    sortOrder: number;
    isActive: boolean;
  };
  const tierDefs: TierDef[] = [
    {
      name: 'Bronze', code: 'BRONZE', minPoints: 0, multiplier: 1.0, sortOrder: 1, isActive: true,
      benefits: { freeShipping: false, birthdayBonus: 0, supportPriority: 'standard' },
    },
    {
      name: 'Silver', code: 'SILVER', minPoints: 500, multiplier: 1.25, sortOrder: 2, isActive: true,
      benefits: { freeShipping: false, birthdayBonus: 100, supportPriority: 'priority' },
    },
    {
      name: 'Gold', code: 'GOLD', minPoints: 1000, multiplier: 1.5, sortOrder: 3, isActive: true,
      benefits: { freeShipping: true, birthdayBonus: 250, supportPriority: 'concierge' },
    },
  ];
  const tierRepo = ctx.repo<LoyaltyTier>(LoyaltyTier);
  for (const def of tierDefs) {
    await foc(tierRepo,
      { tenantId, code: def.code } as FindOptionsWhere<LoyaltyTier>,
      { tenantId, ...def },
    );
  }

  // ── Accounts (one user at GOLD, the admin at SILVER) ────────────────────────
  type AccountDef = {
    userId: string;
    balance: number;
    lifetimePoints: number;
    tier: string;
    metadata: Record<string, unknown>;
  };
  const accountDefs: AccountDef[] = [
    {
      userId, balance: 1050, lifetimePoints: 1500, tier: 'GOLD',
      metadata: { joinedVia: 'seed', referralCount: 3, lastEarnSource: 'order' },
    },
    {
      userId: adminUserId, balance: 320, lifetimePoints: 620, tier: 'SILVER',
      metadata: { joinedVia: 'seed', referralCount: 0, lastEarnSource: 'adjustment' },
    },
  ];
  const accountRepo = ctx.repo<LoyaltyAccount>(LoyaltyAccount);
  const accounts: Record<string, LoyaltyAccount> = {};
  for (const def of accountDefs) {
    accounts[def.userId] = await foc(accountRepo,
      { tenantId, userId: def.userId } as FindOptionsWhere<LoyaltyAccount>,
      { tenantId, ...def },
    );
  }
  const userAccount = accounts[userId];
  const adminAccount = accounts[adminUserId];

  // ── Transaction ledger (append-only; covers EARN / REDEEM / EXPIRE / ADJUST) ─
  // Natural key per row: tenantId + accountId + type + referenceId. The synthetic
  // referenceId on the non-order rows keeps each row uniquely matchable on re-run.
  type TxnDef = {
    accountId: string;
    userId: string;
    type: 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST' | 'REVOKE';
    points: number;
    reason: string;
    referenceType: string;
    referenceId: string;
    balanceAfter: number;
    expiresAt?: Date;
    createdAt: Date;
  };
  const txnDefs: TxnDef[] = [
    // User: earned points on a real order (lot still valid, expires in ~11 months).
    {
      accountId: userAccount.loyaltyAccountId, userId, type: 'EARN', points: 1200,
      reason: 'Order reward (1.5x Gold multiplier)', referenceType: 'order', referenceId: orderId,
      balanceAfter: 1200, expiresAt: daysAgo(-330), createdAt: daysAgo(40),
    },
    // User: an older EARN lot that has already expired (drives the EXPIRE row).
    {
      accountId: userAccount.loyaltyAccountId, userId, type: 'EARN', points: 300,
      reason: 'Welcome bonus', referenceType: 'campaign', referenceId: 'c1000000-0000-4000-8000-000000000001',
      balanceAfter: 1500, expiresAt: daysAgo(5), createdAt: daysAgo(200),
    },
    // User: the matching EXPIRE debit for the lapsed welcome bonus.
    {
      accountId: userAccount.loyaltyAccountId, userId, type: 'EXPIRE', points: -300,
      reason: 'Welcome bonus expired', referenceType: 'campaign', referenceId: 'c1000000-0000-4000-8000-000000000001',
      balanceAfter: 1200, createdAt: daysAgo(5),
    },
    // User: redeemed points at checkout (debit; lifetime untouched).
    {
      accountId: userAccount.loyaltyAccountId, userId, type: 'REDEEM', points: -150,
      reason: 'Checkout discount', referenceType: 'order', referenceId: 'b0000000-0000-4000-8000-000000000002',
      balanceAfter: 1050, createdAt: daysAgo(3),
    },
    // Admin: manual goodwill adjustment (positive → accrues to lifetime).
    {
      accountId: adminAccount.loyaltyAccountId, userId: adminUserId, type: 'ADJUST', points: 620,
      reason: 'Manual goodwill credit', referenceType: 'manual', referenceId: 'd1000000-0000-4000-8000-000000000001',
      balanceAfter: 620, createdAt: daysAgo(20),
    },
    // Admin: a fraud REVOKE clawback (debit) on a flagged reference.
    {
      accountId: adminAccount.loyaltyAccountId, userId: adminUserId, type: 'REVOKE', points: -300,
      reason: 'Fraud clawback', referenceType: 'review', referenceId: 'e1000000-0000-4000-8000-000000000001',
      balanceAfter: 320, createdAt: daysAgo(10),
    },
  ];
  const txnRepo = ctx.repo<LoyaltyTransaction>(LoyaltyTransaction);
  for (const def of txnDefs) {
    await foc(txnRepo,
      { tenantId, accountId: def.accountId, type: def.type, referenceId: def.referenceId } as FindOptionsWhere<LoyaltyTransaction>,
      { tenantId, ...def },
    );
  }

  // ── Publish references other modules might consume ──────────────────────────
  refs.loyaltyAccountId = userAccount.loyaltyAccountId;

  ctx.log(`payment_loyalty_points: 3 tiers, 2 accounts, ${txnDefs.length} ledger entries for ${tenantId}`);
}
