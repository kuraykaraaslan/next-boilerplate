import { z } from 'zod';
import { TransactionTypeEnum } from './wallet.enums';

// Minor-unit amount carried as a decimal string (bigint-safe). Positive only at
// the API boundary; signs are assigned by the posting logic.
const AmountString = z
  .string()
  .regex(/^\d+$/, 'Amount must be a non-negative integer (minor units)')
  .refine((v) => /^\d+$/.test(v) && BigInt(v) > BigInt(0), 'Amount must be greater than zero');

const CurrencyCode = z
  .string()
  .min(1)
  .max(12)
  .transform((v) => v.toUpperCase());

const Reference = z.object({
  referenceType: z.string().max(64).optional(),
  referenceId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  idempotencyKey: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// A single posting leg for the low-level postTransaction API (admin).
export const PostingEntryDTO = z.object({
  accountId: z.string().uuid(),
  amount: z
    .string()
    .regex(/^-?\d+$/, 'Amount must be an integer (minor units)')
    .refine((v) => /^-?\d+$/.test(v) && BigInt(v) !== BigInt(0), 'Amount cannot be zero'),
});
export type PostingEntryDTO = z.infer<typeof PostingEntryDTO>;

export const PostTransactionDTO = Reference.extend({
  type: TransactionTypeEnum,
  currency: CurrencyCode,
  entries: z.array(PostingEntryDTO).min(2),
});
export type PostTransactionDTO = z.infer<typeof PostTransactionDTO>;

export const IssueCreditsDTO = Reference.extend({
  userId: z.string().uuid(),
  amount: AmountString,
  currency: CurrencyCode.optional(),
});
export type IssueCreditsDTO = z.infer<typeof IssueCreditsDTO>;

export const TransferCreditsDTO = Reference.extend({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amount: AmountString,
  currency: CurrencyCode.optional(),
}).refine((v) => v.fromUserId !== v.toUserId, {
  message: 'Cannot transfer to the same user',
  path: ['toUserId'],
});
export type TransferCreditsDTO = z.infer<typeof TransferCreditsDTO>;

export const SpendCreditsDTO = Reference.extend({
  userId: z.string().uuid(),
  amount: AmountString,
  currency: CurrencyCode.optional(),
});
export type SpendCreditsDTO = z.infer<typeof SpendCreditsDTO>;

// Booking settlement (called from the booking module).
export const CaptureDTO = Reference.extend({
  userId: z.string().uuid(),
  amount: AmountString,
  currency: CurrencyCode.optional(),
});
export type CaptureDTO = z.infer<typeof CaptureDTO>;

export const ListAccountsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  ownerId: z.string().uuid().optional(),
  kind: z.string().optional(),
  currency: z.string().optional(),
});
export type ListAccountsQuery = z.infer<typeof ListAccountsQuery>;

export const ListTransactionsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  type: TransactionTypeEnum.optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
});
export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuery>;

export const GetStatementQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type GetStatementQuery = z.infer<typeof GetStatementQuery>;
