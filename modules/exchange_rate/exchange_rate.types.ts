import { z } from 'zod'

/**
 * A resolved multiplicative FX rate: `amountTo = amountFrom * rate`.
 */
export const ExchangeRateQuoteSchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  rate: z.number().positive(),
})

export type ExchangeRateQuote = z.infer<typeof ExchangeRateQuoteSchema>
