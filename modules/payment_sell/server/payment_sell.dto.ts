import { z } from 'zod'
import { PaymentProviderEnum, PaymentMethodEnum, PaymentCurrencyEnum } from '@kuraykaraaslan/payment_core/server/payment_core.enums'
import { PaymentStatusEnum, TransactionTypeEnum, TransactionStatusEnum } from './payment_sell.enums'
import { BillingAddressSchema } from './payment_sell.types'

// ============================================================================
// Payment DTOs
// ============================================================================

export const CreatePaymentDTO = z.object({
  userId: z.string().uuid().optional(),
  provider: PaymentProviderEnum,
  amount: z.number().positive(),
  currency: PaymentCurrencyEnum,
  paymentMethod: PaymentMethodEnum.optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  billingAddress: BillingAddressSchema.optional(),
  expiresAt: z.date().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  /** Client-supplied key to make checkout creation idempotent (double-submit guard). */
  idempotencyKey: z.string().min(8).max(255).optional(),
})
export type CreatePaymentDTO = z.infer<typeof CreatePaymentDTO>

export const UpdatePaymentDTO = z.object({
  status: PaymentStatusEnum.optional(),
  paymentMethod: PaymentMethodEnum.optional(),
  providerPaymentId: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  billingAddress: BillingAddressSchema.optional(),
  failureCode: z.string().optional(),
  failureMessage: z.string().optional(),
})
export type UpdatePaymentDTO = z.infer<typeof UpdatePaymentDTO>

export const GetPaymentsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  userId: z.string().uuid().optional(),
  provider: PaymentProviderEnum.optional(),
  status: PaymentStatusEnum.optional(),
  currency: PaymentCurrencyEnum.optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
})
export type GetPaymentsQuery = z.infer<typeof GetPaymentsQuery>

export const RefundPaymentDTO = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
})
export type RefundPaymentDTO = z.infer<typeof RefundPaymentDTO>

// ============================================================================
// Transaction DTOs
// ============================================================================

export const CreateTransactionDTO = z.object({
  paymentId: z.string().uuid(),
  provider: PaymentProviderEnum,
  providerTransactionId: z.string().optional(),
  type: TransactionTypeEnum,
  status: TransactionStatusEnum.default('PENDING'),
  amount: z.number().positive(),
  currency: PaymentCurrencyEnum,
  fee: z.number().nonnegative().optional(),
  net: z.number().optional(),
  providerResponse: z.record(z.string(), z.any()).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  parentTransactionId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  processedAt: z.date().optional(),
})
export type CreateTransactionDTO = z.infer<typeof CreateTransactionDTO>

export const GetTransactionsQuery = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(20),
  paymentId: z.string().uuid().optional(),
  type: TransactionTypeEnum.optional(),
  status: TransactionStatusEnum.optional(),
})
export type GetTransactionsQuery = z.infer<typeof GetTransactionsQuery>
