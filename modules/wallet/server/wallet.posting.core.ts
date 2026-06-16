import 'reflect-metadata';
import { type EntityManager } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import redis from '@nb/redis';
import Logger from '@nb/logger';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import WebhookService from '@nb/webhook/server/webhook.service';
import { WalletAccount as WalletAccountEntity } from './entities/wallet_account.entity';
import { WalletTransaction as WalletTransactionEntity } from './entities/wallet_transaction.entity';
import { WalletPosting as WalletPostingEntity } from './entities/wallet_posting.entity';
import WalletCrudService from './wallet.crud.service';
import {
  WalletTransactionWithPostingsSchema,
  type WalletTransactionWithPostings,
} from './wallet.types';
import { WALLET_MESSAGES as MESSAGES } from './wallet.messages';
import type { TransactionType } from './wallet.enums';

export interface InternalEntry {
  accountId: string;
  amount: bigint;
}

export interface InternalInput {
  type: TransactionType;
  currency: string;
  entries: InternalEntry[];
  referenceType?: string;
  referenceId?: string;
  description?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Post a balanced double-entry transaction. Validates the zero-sum invariant,
 * locks the affected accounts FOR UPDATE in deterministic order (deadlock-free),
 * appends postings with running balance + per-account hash chain, and updates
 * the denormalized cached balances — all atomically.
 */
export async function postTransaction(
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
