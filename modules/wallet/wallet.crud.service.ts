import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { IsNull, type EntityManager, type FindOptionsWhere } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { WalletAccount as WalletAccountEntity } from './entities/wallet_account.entity';
import { WalletTransaction as WalletTransactionEntity } from './entities/wallet_transaction.entity';
import { WalletPosting as WalletPostingEntity } from './entities/wallet_posting.entity';
import {
  WalletAccountSchema,
  WalletPostingSchema,
  WalletTransactionSchema,
  type WalletAccount,
  type WalletPosting,
  type WalletTransaction,
} from './wallet.types';
import type { GetStatementQuery, ListAccountsQuery, ListTransactionsQuery } from './wallet.dto';
import { WALLET_MESSAGES } from './wallet.messages';
import { DEFAULT_CURRENCY, SYSTEM_ACCOUNT_SPECS } from './wallet.constants';
import type { AccountKind } from './wallet.enums';

const UNIQUE_VIOLATION = '23505';

/** Row content hashed into the per-account tamper-evident chain. */
export interface PostingHashRow {
  tenantId: string;
  transactionId: string;
  accountId: string;
  amount: string;
  currency: string;
  balanceAfter: string;
  createdAt: Date;
}

export default class WalletCrudService {
  // ──────────────────────────────────────────────
  // Hash chain (mirrors audit_log.computeRowHash / canonicalize)
  // ──────────────────────────────────────────────

  /** Deterministic SHA-256 over canonical row content chained to prevHash. */
  static computeRowHash(prevHash: string | null, row: PostingHashRow): string {
    const canonical = JSON.stringify({
      tenantId: row.tenantId,
      transactionId: row.transactionId,
      accountId: row.accountId,
      amount: row.amount,
      currency: row.currency,
      balanceAfter: row.balanceAfter,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    });
    return createHash('sha256').update((prevHash ?? '') + canonical).digest('hex');
  }

  // ──────────────────────────────────────────────
  // Account provisioning (idempotent, race-safe)
  // ──────────────────────────────────────────────

  /** Find or create an account; the unique index makes concurrent creates safe. */
  static async getOrCreateAccount(
    tenantId: string,
    params: {
      ownerType: 'USER' | 'SYSTEM' | 'TENANT';
      ownerId: string | null;
      kind: AccountKind;
      currency: string;
      allowOverdraft: boolean;
    },
  ): Promise<WalletAccountEntity> {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(WalletAccountEntity);
    const where: FindOptionsWhere<WalletAccountEntity> = {
      tenantId,
      ownerType: params.ownerType,
      ownerId: params.ownerId === null ? IsNull() : params.ownerId,
      kind: params.kind,
      currency: params.currency,
    };
    const existing = await repo.findOne({ where });
    if (existing) return existing;
    try {
      return await repo.save(
        repo.create({
          tenantId,
          ownerType: params.ownerType,
          ownerId: params.ownerId,
          kind: params.kind,
          currency: params.currency,
          cachedBalance: BigInt(0),
          allowOverdraft: params.allowOverdraft,
          status: 'ACTIVE',
        }),
      );
    } catch (error) {
      // Lost the create race — the row now exists, re-read it.
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        const row = await repo.findOne({ where });
        if (row) return row;
      }
      throw error;
    }
  }

  /** Lazily provision the SYSTEM_* contra-accounts for a (tenant, currency). */
  static async ensureSystemAccounts(tenantId: string, currency = DEFAULT_CURRENCY): Promise<void> {
    for (const spec of SYSTEM_ACCOUNT_SPECS) {
      await WalletCrudService.getOrCreateAccount(tenantId, {
        ownerType: 'SYSTEM',
        ownerId: null,
        kind: spec.kind,
        currency,
        allowOverdraft: spec.allowOverdraft,
      });
    }
  }

  static async getOrCreateUserWallet(
    tenantId: string,
    userId: string,
    currency = DEFAULT_CURRENCY,
  ): Promise<WalletAccount> {
    const account = await WalletCrudService.getOrCreateAccount(tenantId, {
      ownerType: 'USER',
      ownerId: userId,
      kind: 'USER_WALLET',
      currency,
      allowOverdraft: false,
    });
    return WalletAccountSchema.parse(account);
  }

  /** Resolve a SYSTEM_* account id within a transaction (must already exist). */
  static async getSystemAccountTx(
    manager: EntityManager,
    tenantId: string,
    kind: AccountKind,
    currency: string,
  ): Promise<WalletAccountEntity> {
    const account = await manager.getRepository(WalletAccountEntity).findOne({
      where: { tenantId, ownerType: 'SYSTEM', ownerId: IsNull(), kind, currency },
    });
    if (!account) throw new AppError(WALLET_MESSAGES.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return account;
  }

  // ──────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────

  static async getAccount(tenantId: string, accountId: string): Promise<WalletAccount> {
    const ds = await tenantDataSourceFor(tenantId);
    const account = await ds.getRepository(WalletAccountEntity).findOne({
      where: { tenantId, walletAccountId: accountId },
    });
    if (!account) throw new AppError(WALLET_MESSAGES.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    return WalletAccountSchema.parse(account);
  }

  static async getBalance(tenantId: string, accountId: string): Promise<string> {
    const account = await WalletCrudService.getAccount(tenantId, accountId);
    return account.cachedBalance;
  }

  static async listAccounts(
    tenantId: string,
    query: ListAccountsQuery,
  ): Promise<{ data: WalletAccount[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.ownerId) where['ownerId'] = query.ownerId;
    if (query.kind) where['kind'] = query.kind;
    if (query.currency) where['currency'] = query.currency;
    const [rows, total] = await ds.getRepository(WalletAccountEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => WalletAccountSchema.parse(r)), total };
  }

  static async listTransactions(
    tenantId: string,
    query: ListTransactionsQuery,
  ): Promise<{ data: WalletTransaction[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.type) where['type'] = query.type;
    if (query.referenceType) where['referenceType'] = query.referenceType;
    if (query.referenceId) where['referenceId'] = query.referenceId;
    const [rows, total] = await ds.getRepository(WalletTransactionEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => WalletTransactionSchema.parse(r)), total };
  }

  static async getStatement(
    tenantId: string,
    accountId: string,
    query: GetStatementQuery,
  ): Promise<{ data: WalletPosting[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const [rows, total] = await ds.getRepository(WalletPostingEntity).findAndCount({
      where: { tenantId, accountId },
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => WalletPostingSchema.parse(r)), total };
  }
}
