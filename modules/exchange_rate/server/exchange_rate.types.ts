import { z } from 'zod'
import { CurrencyCodeEnum } from '@nb/common'

/**
 * A resolved multiplicative FX rate: `amountTo = amountFrom * rate`.
 */
export const ExchangeRateQuoteSchema = z.object({
  from: CurrencyCodeEnum,
  to: CurrencyCodeEnum,
  rate: z.number().positive(),
})

export type ExchangeRateQuote = z.infer<typeof ExchangeRateQuoteSchema>
