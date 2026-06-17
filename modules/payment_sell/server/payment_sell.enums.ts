export {
  PaymentProviderEnum,
  PaymentMethodEnum,
  PaymentCurrencyEnum,
  WebhookEventTypeEnum,
  type PaymentProvider,
  type PaymentMethod,
  type PaymentCurrency,
  type WebhookEventType,
} from '@kuraykaraaslan/payment_core/server/payment_core.enums'

import { z } from 'zod'

export const PaymentStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CANCELLED',
  'EXPIRED',
])
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>

export const TransactionTypeEnum = z.enum(['PAYMENT', 'REFUND', 'CHARGEBACK', 'PAYOUT'])
export type TransactionType = z.infer<typeof TransactionTypeEnum>

export const TransactionStatusEnum = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
export type TransactionStatus = z.infer<typeof TransactionStatusEnum>
