import { z } from 'zod';

export const GiftCardStatusEnum = z.enum([
  'ACTIVE',
  'PARTIALLY_REDEEMED',
  'REDEEMED',
  'EXPIRED',
  'VOID',
]);
export type GiftCardStatus = z.infer<typeof GiftCardStatusEnum>;

export const GiftCardTransactionTypeEnum = z.enum(['ISSUE', 'REDEEM', 'ADJUST', 'VOID']);
export type GiftCardTransactionType = z.infer<typeof GiftCardTransactionTypeEnum>;
