import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { WalletAccount as WalletAccountEntity } from './entities/wallet_account.entity';
import { WalletPosting as WalletPostingEntity } from './entities/wallet_posting.entity';
import WalletCrudService from './wallet.crud.service';
import type { ChainVerificationResult, ReconciliationResult } from './wallet.types';

export default class WalletReconcileService {
  /**
   * Re-derive the per-account hash chain and confirm every `rowHash` matches.
   * Any after-the-fact edit to an amount/balance breaks the chain at that row.
   */
  static async verifyChain(tenantId: string, accountId?: string): Promise<ChainVerificationResult> {
    const ds = await tenantDataSourceFor(tenantId);
    const where = accountId ? { tenantId, accountId } : { tenantId };
    const rows = await ds.getRepository(WalletPostingEntity).find({
      where,
      // Group by account, walk each chain in insertion order.
      order: { accountId: 'ASC', seq: 'ASC' },
    });

    const expectedPrev = new Map<string, string | null>();
    let checked = 0;
    for (const row of rows) {
      checked += 1;
      const prevHash = expectedPrev.get(row.accountId) ?? null;
      if ((row.prevHash ?? null) !== prevHash) {
        return { ok: false, checked, brokenAt: row.walletPostingId };
      }
      const recomputed = WalletCrudService.computeRowHash(prevHash, {
        tenantId: row.tenantId,
        transactionId: row.transactionId,
        accountId: row.accountId,
        amount: row.amount.toString(),
        currency: row.currency,
        balanceAfter: row.balanceAfter.toString(),
        createdAt: row.createdAt,
      });
      if (recomputed !== (row.rowHash ?? null)) {
        return { ok: false, checked, brokenAt: row.walletPostingId };
      }
      expectedPrev.set(row.accountId, row.rowHash ?? null);
    }
    return { ok: true, checked, brokenAt: null };
  }

  /**
   * Assert ledger integrity: each account's cached balance equals the sum of
   * its postings, and the system-wide sum per currency is zero (double entry).
   */
  static async reconcile(tenantId: string, currency?: string): Promise<ReconciliationResult> {
    const ds = await tenantDataSourceFor(tenantId);
    const accountWhere = currency ? { tenantId, currency } : { tenantId };
    const accounts = await ds.getRepository(WalletAccountEntity).find({ where: accountWhere });
    const postingWhere = currency ? { tenantId, currency } : { tenantId };
    const postings = await ds.getRepository(WalletPostingEntity).find({ where: postingWhere });

    const sumByAccount = new Map<string, bigint>();
    const sumByCurrency = new Map<string, bigint>();
    for (const p of postings) {
      sumByAccount.set(p.accountId, (sumByAccount.get(p.accountId) ?? BigInt(0)) + p.amount);
      sumByCurrency.set(p.currency, (sumByCurrency.get(p.currency) ?? BigInt(0)) + p.amount);
    }

    let ok = true;
    const perAccount = accounts.map((a) => {
      const computed = sumByAccount.get(a.walletAccountId) ?? BigInt(0);
      const accountOk = computed === a.cachedBalance;
      if (!accountOk) ok = false;
      return {
        accountId: a.walletAccountId,
        cached: a.cachedBalance.toString(),
        computed: computed.toString(),
        ok: accountOk,
      };
    });

    const sumOut: Record<string, string> = {};
    for (const [cur, total] of sumByCurrency) {
      sumOut[cur] = total.toString();
      if (total !== BigInt(0)) ok = false;
    }

    return { ok, perAccount, sumByCurrency: sumOut };
  }
}
