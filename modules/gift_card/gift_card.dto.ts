import { z } from 'zod';
import { GiftCardStatusEnum } from './gift_card.enums';

const CurrencyCode = z
  .string()
  .length(3)
  .transform((v) => v.toUpperCase());

// Amount in integer minor units (e.g. cents).
const Amount = z.number().int().positive();

export const IssueGiftCardRequestSchema = z.object({
  amount: Amount,
  currency: CurrencyCode,
  recipientEmail: z.string().email().optional(),
  recipientUserId: z.string().uuid().optional(),
  purchaserUserId: z.string().uuid().optional(),
  purchaserPaymentId: z.string().uuid().optional(),
  message: z.string().max(2000).optional(),
  expiresAt: z.coerce.date().optional(),
  /** Issue this many identical cards in one call. */
  quantity: z.number().int().positive().max(500).default(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type IssueGiftCardDTO = z.infer<typeof IssueGiftCardRequestSchema>;

export const RedeemGiftCardRequestSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase().trim()),
  userId: z.string().uuid(),
  /** Optional partial redemption; defaults to the full remaining balance. */
  amount: Amount.optional(),
  currency: CurrencyCode.optional(),
});
export type RedeemGiftCardDTO = z.infer<typeof RedeemGiftCardRequestSchema>;

export const CheckBalanceRequestSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase().trim()),
});
export type CheckBalanceDTO = z.infer<typeof CheckBalanceRequestSchema>;

export const AdjustGiftCardRequestSchema = z.object({
  /** Signed delta in minor units applied to the remaining balance. */
  delta: z.number().int().refine((v) => v !== 0, 'Delta cannot be zero'),
  note: z.string().max(2000).optional(),
});
export type AdjustGiftCardDTO = z.infer<typeof AdjustGiftCardRequestSchema>;

export const GetGiftCardsQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: GiftCardStatusEnum.optional(),
  purchaserUserId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type GetGiftCardsQuery = z.infer<typeof GetGiftCardsQuerySchema>;
