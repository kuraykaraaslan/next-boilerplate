import { z } from 'zod'
import { codes } from 'currency-codes-ts'
import type { CurrencyCode } from 'currency-codes-ts/dist/types'

export const PaymentProviderEnum = z.enum(['stripe', 'paypal', 'iyzico'])

export const PaymentStatusEnum = z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled'])

// ISO 4217 currency codes from currency-codes-ts package
const currencyCodes = codes() as [CurrencyCode, ...CurrencyCode[]]
export const PaymentCurrencyEnum = z.enum(currencyCodes)

export type PaymentProviderType = z.infer<typeof PaymentProviderEnum>
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>
export type PaymentCurrency = z.infer<typeof PaymentCurrencyEnum>

// Re-export for convenience
export type { CurrencyCode, CurrencyCodeRecord } from 'currency-codes-ts/dist/types'
export { code as getCurrencyByCode, country as getCurrencyByCountry, codes as getAllCurrencyCodes } from 'currency-codes-ts'
