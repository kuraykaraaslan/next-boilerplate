import { z } from 'zod'
import { PaymentProviderEnum, PaymentMethodEnum } from '@kuraykaraaslan/payment_core/server/payment_core.enums'
import { PaymentStatusEnum, TransactionTypeEnum, TransactionStatusEnum } from './payment_sell.enums'

export const BillingAddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
})
export type BillingAddress = z.infer<typeof BillingAddressSchema>

export const PaymentSchema = z.object({
  paymentId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  tenantId: z.string().uuid().nullable(),
  provider: PaymentProviderEnum,
  providerPaymentId: z.string().nullable(),
  amount: z.number(),
  currency: z.string().max(3),
  status: PaymentStatusEnum,
  paymentMethod: PaymentMethodEnum.nullable(),
  description: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  customerEmail: z.string().nullable(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  billingAddress: BillingAddressSchema.nullable(),
  refundedAmount: z.number().nullable(),
  failureCode: z.string().nullable(),
  failureMessage: z.string().nullable(),
  paidAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  refundedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
})
export type Payment = z.infer<typeof PaymentSchema>

export const SafePaymentSchema = PaymentSchema.omit({ deletedAt: true })
export type SafePayment = z.infer<typeof SafePaymentSchema>

export const PaymentTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  paymentId: z.string().uuid(),
  provider: PaymentProviderEnum,
  providerTransactionId: z.string().nullable(),
  type: TransactionTypeEnum,
  status: TransactionStatusEnum,
  amount: z.number(),
  currency: z.string().max(3),
  fee: z.number().nullable(),
  net: z.number().nullable(),
  providerResponse: z.record(z.string(), z.any()).nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  parentTransactionId: z.string().uuid().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  processedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type PaymentTransaction = z.infer<typeof PaymentTransactionSchema>

export const PaymentWithTransactionsSchema = SafePaymentSchema.extend({
  transactions: z.array(PaymentTransactionSchema),
})
export type PaymentWithTransactions = z.infer<typeof PaymentWithTransactionsSchema>

export const CheckoutResultSchema = z.object({
  paymentId: z.string().uuid(),
  sessionId: z.string(),
  checkoutUrl: z.string().url(),
  provider: PaymentProviderEnum,
  expiresAt: z.date().nullable(),
})
export type CheckoutResult = z.infer<typeof CheckoutResultSchema>
