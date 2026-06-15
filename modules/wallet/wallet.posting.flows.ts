import 'reflect-metadata';
import WalletCrudService from './wallet.crud.service';
import type { WalletTransactionWithPostings } from './wallet.types';
import { DEFAULT_CURRENCY } from './wallet.constants';
import type {
  CaptureDTO,
  IssueCreditsDTO,
  PostTransactionDTO,
  SpendCreditsDTO,
  TransferCreditsDTO,
} from './wallet.dto';
import { postTransaction } from './wallet.posting.core';

/** Mint credit into a user wallet (admin grant / post-purchase). */
export async function issue(tenantId: string, dto: IssueCreditsDTO): Promise<WalletTransactionWithPostings> {
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
  return postTransaction(tenantId, {
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
export async function transfer(tenantId: string, dto: TransferCreditsDTO): Promise<WalletTransactionWithPostings> {
  const currency = dto.currency ?? DEFAULT_CURRENCY;
  await WalletCrudService.ensureSystemAccounts(tenantId, currency);
  const from = await WalletCrudService.getOrCreateUserWallet(tenantId, dto.fromUserId, currency);
  const to = await WalletCrudService.getOrCreateUserWallet(tenantId, dto.toUserId, currency);
  const amount = BigInt(dto.amount);
  return postTransaction(tenantId, {
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
export async function spend(tenantId: string, dto: SpendCreditsDTO): Promise<WalletTransactionWithPostings> {
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
  return postTransaction(tenantId, {
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
export async function captureForBooking(tenantId: string, dto: CaptureDTO): Promise<WalletTransactionWithPostings> {
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
  return postTransaction(tenantId, {
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
export async function refundForBooking(tenantId: string, dto: CaptureDTO): Promise<WalletTransactionWithPostings> {
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
  return postTransaction(tenantId, {
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
export async function postRaw(tenantId: string, dto: PostTransactionDTO): Promise<WalletTransactionWithPostings> {
  await WalletCrudService.ensureSystemAccounts(tenantId, dto.currency);
  return postTransaction(tenantId, {
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
