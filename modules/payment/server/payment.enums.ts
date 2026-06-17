import { z } from 'zod'
import { CurrencyCodeEnum } from '@kuraykaraaslan/common'

// Payment Provider - matches Prisma PaymentProvider enum
export const PaymentProviderEnum = z.enum([
  'STRIPE',
  'PAYPAL',
  'IYZICO',
  'ALIPAY',
  'WECHATPAY',
  'YOOKASSA',
  'CLOUDPAYMENTS',
  // Offline / manual settlement (cash, bank wire). No online processing — the
  // payment is recorded PENDING and an operator marks it paid once funds arrive.
  'MANUAL',
])

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

// Single-sourced from @/modules/common (ISO 4217, backed by currency-codes-ts)
// so the platform has ONE currency enum. Alias kept as PaymentCurrencyEnum for
// back-compat with existing payment consumers.
export const PaymentCurrencyEnum = CurrencyCodeEnum

// Card brand — detected client-side from the card BIN. Shared by the (provider-agnostic)
// credit-card form and by direct-charge flows. Mirrors the brands the form's detectBrand()
// recognizes, incl. the Turkish TROY network.
export const CardBrandEnum = z.enum([
  'VISA',
  'MASTERCARD',
  'AMEX',
  'DISCOVER',
  'TROY',
  'MIR',
  'UNIONPAY',
  'JCB',
  'UNKNOWN',
])

// Raw card input collected by the custom (non-3DS) payment form. This is PCI-sensitive:
// it is only ever passed straight through to the provider and never persisted or logged.
export const CreditCardInputSchema = z.object({
  cardholderName: z.string().min(1),
  cardNumber: z.string().min(13).max(19),
  expiryMonth: z.string().length(2),
  expiryYear: z.string().length(2),
  cvv: z.string().min(3).max(4),
})

// Wallets / alternative payment methods a provider can surface. Note: MasterPass &
// Visa Checkout merged into CLICK_TO_PAY (EMVCo SRC) globally; MASTERPASS remains a
// live local scheme in Turkey (via iyzico). BKM_EXPRESS is Turkey-local too.
export const WalletMethodEnum = z.enum([
  'CARD',
  'MASTERPASS',
  'BKM_EXPRESS',
  'CLICK_TO_PAY',
  'APPLE_PAY',
  'GOOGLE_PAY',
  'LINK',
  'PAYPAL',
  'AMAZON_PAY',
  'CASH_APP_PAY',
  'SAVED_CARD',
  'INSTALLMENT',
  'ALIPAY',
  'WECHAT_PAY',
  'YOOMONEY',
  'SBP',
  'IDEAL',
  'KLARNA',
])

// How a wallet reaches the buyer:
// - HOSTED_REDIRECT: provider-hosted page renders it (iyzico MasterPass/BKM, PayPal…)
// - CLIENT_ELEMENT: browser SDK/Element (Stripe Express Checkout: Apple/Google Pay, Click to Pay…)
// - DIRECT_API: server-to-server wallet protocol (iyzico MasterPass direct — not yet)
export const WalletDeliveryEnum = z.enum(['HOSTED_REDIRECT', 'CLIENT_ELEMENT', 'DIRECT_API'])

export const WalletDescriptorSchema = z.object({
  method: WalletMethodEnum,
  delivery: WalletDeliveryEnum,
})

// Type exports
export type PaymentProvider = z.infer<typeof PaymentProviderEnum>
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>
export type TransactionType = z.infer<typeof TransactionTypeEnum>
export type TransactionStatus = z.infer<typeof TransactionStatusEnum>
export type PaymentCurrency = z.infer<typeof PaymentCurrencyEnum>
export type CardBrand = z.infer<typeof CardBrandEnum>
export type CreditCardInput = z.infer<typeof CreditCardInputSchema>
export type WalletMethod = z.infer<typeof WalletMethodEnum>
export type WalletDelivery = z.infer<typeof WalletDeliveryEnum>
export type WalletDescriptor = z.infer<typeof WalletDescriptorSchema>

// Re-export currency utilities
export type { CurrencyCode, CurrencyCodeRecord } from 'currency-codes-ts/dist/types'
export { code as getCurrencyByCode, country as getCurrencyByCountry, codes as getAllCurrencyCodes } from 'currency-codes-ts'
