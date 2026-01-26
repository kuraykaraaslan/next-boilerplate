import { z } from 'zod'
import { PaymentStatusEnum, PaymentCurrencyEnum } from './payment.enums'

export const PaymentResultSchema = z.object({
  success: z.boolean(),
  status: PaymentStatusEnum,
  transactionId: z.string().optional(),
  provider: z.string(),
  amount: z.number().optional(),
  currency: PaymentCurrencyEnum.optional(),
  error: z.string().optional(),
})

export const PaymentConfigSchema = z.object({
  defaultProvider: z.string(),
  supportedCurrencies: z.array(PaymentCurrencyEnum),
})

export type PaymentResult = z.infer<typeof PaymentResultSchema>
export type PaymentConfig = z.infer<typeof PaymentConfigSchema>
