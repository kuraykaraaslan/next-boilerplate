import { z } from 'zod';
import { AccountKindEnum, AccountStatusEnum, OwnerTypeEnum, TransactionTypeEnum } from './wallet.enums';

/**
 * Minor-unit amounts cross the wire as decimal strings. The entity holds a
 * `BigInt` (via the column transformer); these schemas accept either a BigInt
 * or a string and normalize to string so `JSON.stringify` never chokes on a
 * raw BigInt.
 */
const BigIntString = z
  .union([z.bigint(), z.string()])
  .transform((v) => v.toString());

export const WalletAccountSchema = z.object({
  walletAccountId: z.string().uuid(),
  tenantId: z.string().uuid(),
  ownerType: OwnerTypeEnum,
  ownerId: z.string().uuid().nullable(),
  kind: AccountKindEnum,
  currency: z.string(),
  cachedBalance: BigIntString,
  allowOverdraft: z.boolean(),
  status: AccountStatusEnum,
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type WalletAccount = z.infer<typeof WalletAccountSchema>;

export const WalletTransactionSchema = z.object({
  walletTransactionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: TransactionTypeEnum,
  referenceType: z.string().nullable(),
  referenceId: z.string().uuid().nullable(),
  description: z.string().nullable(),
  currency: z.string(),
  idempotencyKey: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;

export const WalletPostingSchema = z.object({
  walletPostingId: z.string().uuid(),
  tenantId: z.string().uuid(),
  transactionId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: BigIntString,
  currency: z.string(),
  balanceAfter: BigIntString,
  prevHash: z.string().nullable(),
  rowHash: z.string().nullable(),
  createdAt: z.date(),
});
export type WalletPosting = z.infer<typeof WalletPostingSchema>;

export const WalletTransactionWithPostingsSchema = WalletTransactionSchema.extend({
  postings: z.array(WalletPostingSchema),
});
export type WalletTransactionWithPostings = z.infer<typeof WalletTransactionWithPostingsSchema>;

export interface ChainVerificationResult {
  ok: boolean;
  checked: number;
  brokenAt: string | null;
}

export interface ReconciliationResult {
  ok: boolean;
  perAccount: { accountId: string; cached: string; computed: string; ok: boolean }[];
  sumByCurrency: Record<string, string>;
}
