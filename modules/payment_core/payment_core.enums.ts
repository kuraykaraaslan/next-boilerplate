import { z } from 'zod'
import { CurrencyCodeEnum } from '@/modules/common'

export const PaymentProviderEnum = z.enum([
  'STRIPE',
  'PAYPAL',
  'IYZICO',
  'ALIPAY',
  'WECHATPAY',
  'YOOKASSA',
  'CLOUDPAYMENTS',
])

export const PaymentMethodEnum = z.enum([
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'PAYPAL',
  'APPLE_PAY',
  'GOOGLE_PAY',
  'OTHER',
])

// Single-sourced from @/modules/common (ISO 4217, backed by currency-codes-ts)
// so the platform has ONE currency enum. Alias kept as PaymentCurrencyEnum for
// existing importers.
export const PaymentCurrencyEnum = CurrencyCodeEnum

export const WebhookEventTypeEnum = z.enum([
  'payment.completed',
  'payment.failed',
  'payment.expired',
  'payment.refunded',
  'subscription.renewed',
  'subscription.cancelled',
  'subscription.past_due',
])

export type PaymentProvider = z.infer<typeof PaymentProviderEnum>
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>
export type PaymentCurrency = z.infer<typeof PaymentCurrencyEnum>
export type WebhookEventType = z.infer<typeof WebhookEventTypeEnum>

export type { CurrencyCode, CurrencyCodeRecord } from 'currency-codes-ts/dist/types'
export { code as getCurrencyByCode, country as getCurrencyByCountry, codes as getAllCurrencyCodes } from 'currency-codes-ts'
