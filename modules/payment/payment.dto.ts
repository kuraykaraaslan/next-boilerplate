import { z } from 'zod'
import {
  PaymentProviderEnum,
  PaymentStatusEnum,
  PaymentMethodEnum,
  PaymentCurrencyEnum,
  TransactionTypeEnum,
  TransactionStatusEnum,
} from './payment.enums'
import { BillingAddressSchema } from './payment.types'

// ============================================================================
// Payment DTOs
// ============================================================================

export const CreatePaymentRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  provider: PaymentProviderEnum,
  amount: z.number().positive('Amount must be positive'),
  currency: PaymentCurrencyEnum,
  paymentMethod: PaymentMethodEnum.optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  billingAddress: BillingAddressSchema.optional(),
  expiresAt: z.date().optional(),
})

export const UpdatePaymentRequestSchema = z.object({
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

export const GetPaymentByIdRequestSchema = z.object({
  paymentId: z.string().uuid(),
})

export const GetPaymentsQuerySchema = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(10),
  userId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  provider: PaymentProviderEnum.optional(),
  status: PaymentStatusEnum.optional(),
  currency: PaymentCurrencyEnum.optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
})

export const GetProviderStatusRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  provider: PaymentProviderEnum.optional(),
})

// ============================================================================
// Transaction DTOs
// ============================================================================

export const CreateTransactionRequestSchema = z.object({
  paymentId: z.string().uuid(),
  provider: PaymentProviderEnum,
  providerTransactionId: z.string().optional(),
  type: TransactionTypeEnum,
  amount: z.number().positive('Amount must be positive'),
  currency: PaymentCurrencyEnum,
  fee: z.number().optional(),
  net: z.number().optional(),
  providerResponse: z.record(z.string(), z.any()).optional(),
  parentTransactionId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export const UpdateTransactionRequestSchema = z.object({
  status: TransactionStatusEnum.optional(),
  providerTransactionId: z.string().optional(),
  fee: z.number().optional(),
  net: z.number().optional(),
  providerResponse: z.record(z.string(), z.any()).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  processedAt: z.date().optional(),
})

export const GetTransactionByIdRequestSchema = z.object({
  transactionId: z.string().uuid(),
})

export const GetTransactionsQuerySchema = z.object({
  page: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().max(100).default(10),
  paymentId: z.string().uuid().optional(),
  provider: PaymentProviderEnum.optional(),
  type: TransactionTypeEnum.optional(),
  status: TransactionStatusEnum.optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
})

// ============================================================================
// Refund DTOs
// ============================================================================

export const RefundPaymentRequestSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive('Amount must be positive').optional(), // If not provided, full refund
  reason: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

// ============================================================================
// Type Exports
// ============================================================================

export type CreatePaymentDTO = z.infer<typeof CreatePaymentRequestSchema>
export type UpdatePaymentDTO = z.infer<typeof UpdatePaymentRequestSchema>
export type GetPaymentByIdDTO = z.infer<typeof GetPaymentByIdRequestSchema>
export type GetPaymentsQuery = z.infer<typeof GetPaymentsQuerySchema>
export type GetProviderStatusDTO = z.infer<typeof GetProviderStatusRequestSchema>

export type CreateTransactionDTO = z.infer<typeof CreateTransactionRequestSchema>
export type UpdateTransactionDTO = z.infer<typeof UpdateTransactionRequestSchema>
export type GetTransactionByIdDTO = z.infer<typeof GetTransactionByIdRequestSchema>
export type GetTransactionsQuery = z.infer<typeof GetTransactionsQuerySchema>

export type RefundPaymentDTO = z.infer<typeof RefundPaymentRequestSchema>
