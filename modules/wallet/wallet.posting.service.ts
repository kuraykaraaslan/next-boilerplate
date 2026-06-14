import 'reflect-metadata';
import { type EntityManager } from 'typeorm';
import { tenantDataSourceFor } from '@/modules/db';
import redis from '@/modules/redis';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import WebhookService from '@/modules/webhook/webhook.service';
import { WalletAccount as WalletAccountEntity } from './entities/wallet_account.entity';
import { WalletTransaction as WalletTransactionEntity } from './entities/wallet_transaction.entity';
import { WalletPosting as WalletPostingEntity } from './entities/wallet_posting.entity';
import WalletCrudService from './wallet.crud.service';
import {
  WalletTransactionWithPostingsSchema,
  type WalletTransactionWithPostings,
} from './wallet.types';
import { WALLET_MESSAGES as MESSAGES } from './wallet.messages';
import { DEFAULT_CURRENCY } from './wallet.constants';
import type {
  CaptureDTO,
  IssueCreditsDTO,
  PostTransactionDTO,
  SpendCreditsDTO,
  TransferCreditsDTO,
} from './wallet.dto';
import type { TransactionType } from './wallet.enums';

interface InternalEntry {
  accountId: string;
  amount: bigint;
}

interface InternalInput {
  type: TransactionType;
  currency: string;
  entries: InternalEntry[];
  referenceType?: string;
  referenceId?: string;
  description?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export default class WalletPostingService {
  /**
   * Post a balanced double-entry transaction. Validates the zero-sum invariant,
   * locks the affected accounts FOR UPDATE in deterministic order (deadlock-free),
   * appends postings with running balance + per-account hash chain, and updates
   * the denormalized cached balances — all atomically.
   */
  static async postTransaction(
    tenantId: string,
    input: InternalInput,
  ): Promise<WalletTransactionWithPostings> {
    // ── zero-sum + shape validation (cheap, outside the DB tx) ───────────────
    if (input.entries.length < 2) {
      throw new AppError(MESSAGES.INVALID_ENTRIES, 422, ErrorCode.VALIDATION_ERROR);
    }
    const ids = input.entries.map((e) => e.accountId);
    if (new Set(ids).size !== ids.length) {
      throw new AppError(MESSAGES.INVALID_ENTRIES, 422, ErrorCode.VALIDATION_ERROR);
    }
    const sum = input.entries.reduce((acc, e) => acc + e.amount, BigInt(0));
    if (sum !== BigInt(0)) {
      throw new AppError(MESSAGES.NOT_BALANCED, 422, ErrorCode.VALIDATION_ERROR);
    }

    const ds = await tenantDataSourceFor(tenantId);

    // Best-effort cross-pod lock; the pessimistic row lock is the real guard.
    const sortedIds = [...ids].sort();
    const lockKey = `wallet:lock:${tenantId}:${sortedIds.join(',')}`;
    let locked = false;
    try {
      locked = (await redis.set(lockKey, '1', 'EX', 10, 'NX')) === 'OK';
    } catch {
      // fail-open: Redis down should not block ledger writes
    }

    try {
      const result = await ds.transaction(async (manager: EntityManager) => {
        const txnRepo = manager.getRepository(WalletTransactionEntity);
        const postRepo = manager.getRepository(WalletPostingEntity);
        const acctRepo = manager.getRepository(WalletAccountEntity);

        // Idempotent replay — return the existing transaction unchanged.
        if (input.idempotencyKey) {
          const existing = await txnRepo.findOne({
            where: { tenantId, idempotencyKey: input.idempotencyKey },
          });
          if (existing) {
            const postings = await postRepo.find({
              where: { tenantId, transactionId: existing.walletTransactionId },
              order: { seq: 'ASC' },
            });
            return { txn: existing, postings };
          }
        }

        // Lock affected accounts FOR UPDATE in deterministic (sorted) order.
        const accounts = new Map<string, WalletAccountEntity>();
        for (const id of sortedIds) {
          const account = await acctRepo.findOne({
            where: { tenantId, walletAccountId: id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!account) throw new AppError(MESSAGES.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
          if (account.status !== 'ACTIVE') {
            throw new AppError(MESSAGES.ACCOUNT_INACTIVE, 409, ErrorCode.CONFLICT);
          }
          if (account.currency !== input.currency) {
            throw new AppError(MESSAGES.CURRENCY_MISMATCH, 409, ErrorCode.CURRENCY_MISMATCH);
          }
          accounts.set(id, account);
        }

        const txn = await txnRepo.save(
          txnRepo.create({
            tenantId,
            type: input.type,
            currency: input.currency,
            referenceType: input.referenceType ?? null,
            referenceId: input.referenceId ?? null,
            description: input.description ?? null,
            idempotencyKey: input.idempotencyKey ?? null,
            metadata: input.metadata ?? null,
          }),
        );

        const savedPostings: WalletPostingEntity[] = [];
        // Iterate in the caller's original order for stable, readable postings.
        for (const entry of input.entries) {
          const account = accounts.get(entry.accountId)!;
          const newBalance = account.cachedBalance + entry.amount;
          if (newBalance < BigInt(0) && !account.allowOverdraft) {
            throw new AppError(MESSAGES.INSUFFICIENT_FUNDS, 409, ErrorCode.CONFLICT);
          }

          const prev = await postRepo.findOne({
            where: { tenantId, accountId: account.walletAccountId },
            order: { seq: 'DESC' },
          });
          const prevHash = prev?.rowHash ?? null;
          const createdAt = new Date();
          const rowHash = WalletCrudService.computeRowHash(prevHash, {
            tenantId,
            transactionId: txn.walletTransactionId,
            accountId: account.walletAccountId,
            amount: entry.amount.toString(),
            currency: input.currency,
            balanceAfter: newBalance.toString(),
            createdAt,
          });

          const saved = await postRepo.save(
            postRepo.create({
              tenantId,
              transactionId: txn.walletTransactionId,
              accountId: account.walletAccountId,
              amount: entry.amount,
              currency: input.currency,
              balanceAfter: newBalance,
              prevHash,
              rowHash,
              createdAt,
            }),
          );
          savedPostings.push(saved);

          account.cachedBalance = newBalance;
          await acctRepo.save(account);
        }

        return { txn, postings: savedPostings };
      });

      // Fire-and-forget webhook after the commit.
      void WebhookService.dispatchEvent(tenantId, 'wallet.transaction.created', {
        transactionId: result.txn.walletTransactionId,
        type: result.txn.type,
        currency: result.txn.currency,
        referenceType: result.txn.referenceType,
        referenceId: result.txn.referenceId,
      }).catch((err) => Logger.error(`[wallet] webhook dispatch failed: ${err}`));

      return WalletTransactionWithPostingsSchema.parse({
        ...result.txn,
        postings: result.postings,
      });
    } catch (error) {
      if (!(error instanceof AppError)) {
        Logger.error(`${MESSAGES.POST_FAILED}: ${error}`);
      }
      throw error;
    } finally {
      if (locked) await redis.del(lockKey).catch(() => {});
    }
  }

  // ──────────────────────────────────────────────
  // High-level flows
  // ──────────────────────────────────────────────

  /** Mint credit into a user wallet (admin grant / post-purchase). */
  static async issue(tenantId: string, dto: IssueCreditsDTO): Promise<WalletTransactionWithPostings> {
    const currency = dto.currency ?? DEFAULT_CURRENCY;
    await WalletCrudService.ensureSystemAccounts(tenantId, currency);
    const wallet = await WalletCrudService.getOrCreateUserWallet(tenantId, dto.userId, currency);
    const issuer = await WalletCrudService.getOrCreateAccount(tenantId, {
      ownerType: 'SYSTEM',
      ownerId: null,
      kind: 'SYSTEM_ISSUER',
      currency,
      allowOverdraft: true,
    });
    const amount = BigInt(dto.amount);
    return WalletPostingService.postTransaction(tenantId, {
      type: 'ISSUE',
      currency,
      entries: [
        { accountId: issuer.walletAccountId, amount: -amount },
        { accountId: wallet.walletAccountId, amount },
      ],
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
  }

  /** Peer-to-peer credit transfer between two user wallets. */
  static async transfer(
    tenantId: string,
    dto: TransferCreditsDTO,
  ): Promise<WalletTransactionWithPostings> {
    const currency = dto.currency ?? DEFAULT_CURRENCY;
    await WalletCrudService.ensureSystemAccounts(tenantId, currency);
    const from = await WalletCrudService.getOrCreateUserWallet(tenantId, dto.fromUserId, currency);
    const to = await WalletCrudService.getOrCreateUserWallet(tenantId, dto.toUserId, currency);
    const amount = BigInt(dto.amount);
    return WalletPostingService.postTransaction(tenantId, {
      type: 'TRANSFER',
      currency,
      entries: [
        { accountId: from.walletAccountId, amount: -amount },
        { accountId: to.walletAccountId, amount },
      ],
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
  }

  /** Spend credit from a user wallet into system revenue. */
  static async spend(tenantId: string, dto: SpendCreditsDTO): Promise<WalletTransactionWithPostings> {
    const currency = dto.currency ?? DEFAULT_CURRENCY;
    await WalletCrudService.ensureSystemAccounts(tenantId, currency);
    const wallet = await WalletCrudService.getOrCreateUserWallet(tenantId, dto.userId, currency);
    const revenue = await WalletCrudService.getOrCreateAccount(tenantId, {
      ownerType: 'SYSTEM',
      ownerId: null,
      kind: 'SYSTEM_REVENUE',
      currency,
      allowOverdraft: true,
    });
    const amount = BigInt(dto.amount);
    return WalletPostingService.postTransaction(tenantId, {
      type: 'SPEND',
      currency,
      entries: [
        { accountId: wallet.walletAccountId, amount: -amount },
        { accountId: revenue.walletAccountId, amount },
      ],
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
  }

  /** Capture a confirmed booking: user wallet -> escrow. */
  static async captureForBooking(
    tenantId: string,
    dto: CaptureDTO,
  ): Promise<WalletTransactionWithPostings> {
    const currency = dto.currency ?? DEFAULT_CURRENCY;
    await WalletCrudService.ensureSystemAccounts(tenantId, currency);
    const wallet = await WalletCrudService.getOrCreateUserWallet(tenantId, dto.userId, currency);
    const escrow = await WalletCrudService.getOrCreateAccount(tenantId, {
      ownerType: 'SYSTEM',
      ownerId: null,
      kind: 'SYSTEM_ESCROW',
      currency,
      allowOverdraft: true,
    });
    const amount = BigInt(dto.amount);
    return WalletPostingService.postTransaction(tenantId, {
      type: 'BOOKING_CAPTURE',
      currency,
      entries: [
        { accountId: wallet.walletAccountId, amount: -amount },
        { accountId: escrow.walletAccountId, amount },
      ],
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
  }

  /** Refund a cancelled booking: escrow -> user wallet. */
  static async refundForBooking(
    tenantId: string,
    dto: CaptureDTO,
  ): Promise<WalletTransactionWithPostings> {
    const currency = dto.currency ?? DEFAULT_CURRENCY;
    await WalletCrudService.ensureSystemAccounts(tenantId, currency);
    const wallet = await WalletCrudService.getOrCreateUserWallet(tenantId, dto.userId, currency);
    const escrow = await WalletCrudService.getOrCreateAccount(tenantId, {
      ownerType: 'SYSTEM',
      ownerId: null,
      kind: 'SYSTEM_ESCROW',
      currency,
      allowOverdraft: true,
    });
    const amount = BigInt(dto.amount);
    return WalletPostingService.postTransaction(tenantId, {
      type: 'BOOKING_REFUND',
      currency,
      entries: [
        { accountId: escrow.walletAccountId, amount: -amount },
        { accountId: wallet.walletAccountId, amount },
      ],
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
  }

  /** Low-level admin posting from explicit entries (validated DTO). */
  static async postRaw(
    tenantId: string,
    dto: PostTransactionDTO,
  ): Promise<WalletTransactionWithPostings> {
    await WalletCrudService.ensureSystemAccounts(tenantId, dto.currency);
    return WalletPostingService.postTransaction(tenantId, {
      type: dto.type,
      currency: dto.currency,
      entries: dto.entries.map((e) => ({ accountId: e.accountId, amount: BigInt(e.amount) })),
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
  }
}
