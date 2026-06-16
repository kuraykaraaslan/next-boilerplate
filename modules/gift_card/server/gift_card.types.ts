import { z } from 'zod';
import { GiftCardStatusEnum, GiftCardTransactionTypeEnum } from './gift_card.enums';

/**
 * Safe gift-card shape returned to callers. Deliberately omits `codeHash`; the
 * raw `code` is only ever returned once, from `issue()`, never from reads.
 */
export const GiftCardSchema = z.object({
  giftCardId: z.string().uuid(),
  code: z.string(),
  status: GiftCardStatusEnum,
  initialAmount: z.coerce.number(),
  remainingAmount: z.coerce.number(),
  currency: z.string(),
  purchaserUserId: z.string().nullable().optional(),
  purchaserPaymentId: z.string().nullable().optional(),
  recipientEmail: z.string().nullable().optional(),
  recipientUserId: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  lastRedeemedAt: z.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GiftCard = z.infer<typeof GiftCardSchema>;

export const GiftCardTransactionSchema = z.object({
  giftCardTransactionId: z.string().uuid(),
  giftCardId: z.string().uuid(),
  type: GiftCardTransactionTypeEnum,
  amount: z.coerce.number(),
  balanceAfter: z.coerce.number(),
  walletTransactionId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.date(),
});
export type GiftCardTransaction = z.infer<typeof GiftCardTransactionSchema>;

export const GiftCardBalanceSchema = z.object({
  status: GiftCardStatusEnum,
  remainingAmount: z.coerce.number(),
  currency: z.string(),
  expiresAt: z.date().nullable().optional(),
});
export type GiftCardBalance = z.infer<typeof GiftCardBalanceSchema>;

export const RedeemResultSchema = z.object({
  creditedAmount: z.number(),
  remainingAmount: z.number(),
  currency: z.string(),
  walletTransactionId: z.string().nullable(),
  status: GiftCardStatusEnum,
});
export type RedeemResult = z.infer<typeof RedeemResultSchema>;
