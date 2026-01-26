import { z } from 'zod'
import { PaymentProviderEnum } from './payment.enums'

export const GetPaymentStatusRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  provider: PaymentProviderEnum.optional(),
})

export type GetPaymentStatusDTO = z.infer<typeof GetPaymentStatusRequestSchema>
