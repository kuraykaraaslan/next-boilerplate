import { z } from 'zod'
import { codes } from 'currency-codes-ts'
import type { CurrencyCode } from 'currency-codes-ts/dist/types'

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

const currencyCodes = codes() as [CurrencyCode, ...CurrencyCode[]]
export const PaymentCurrencyEnum = z.enum(currencyCodes)

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
