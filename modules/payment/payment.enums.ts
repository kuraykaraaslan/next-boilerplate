import { z } from 'zod'
import { codes } from 'currency-codes-ts'
import type { CurrencyCode } from 'currency-codes-ts/dist/types'

// Payment Provider - matches Prisma PaymentProvider enum
export const PaymentProviderEnum = z.enum(['STRIPE', 'PAYPAL', 'IYZICO'])

// Payment Status - matches Prisma PaymentStatus enum
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

// Payment Method - matches Prisma PaymentMethod enum
export const PaymentMethodEnum = z.enum([
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'PAYPAL',
  'APPLE_PAY',
  'GOOGLE_PAY',
  'OTHER',
])

// Transaction Type - matches Prisma TransactionType enum
export const TransactionTypeEnum = z.enum(['PAYMENT', 'REFUND', 'CHARGEBACK', 'PAYOUT'])

// Transaction Status - matches Prisma TransactionStatus enum
export const TransactionStatusEnum = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])

// ISO 4217 currency codes from currency-codes-ts package
const currencyCodes = codes() as [CurrencyCode, ...CurrencyCode[]]
export const PaymentCurrencyEnum = z.enum(currencyCodes)

// Type exports
export type PaymentProvider = z.infer<typeof PaymentProviderEnum>
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>
export type TransactionType = z.infer<typeof TransactionTypeEnum>
export type TransactionStatus = z.infer<typeof TransactionStatusEnum>
export type PaymentCurrency = z.infer<typeof PaymentCurrencyEnum>

// Re-export currency utilities
export type { CurrencyCode, CurrencyCodeRecord } from 'currency-codes-ts/dist/types'
export { code as getCurrencyByCode, country as getCurrencyByCountry, codes as getAllCurrencyCodes } from 'currency-codes-ts'
