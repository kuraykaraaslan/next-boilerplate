import { z } from 'zod'
import { PaymentProviderEnum, WebhookEventTypeEnum } from './payment_core.enums'

export const BillingAddressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
})
export type BillingAddress = z.infer<typeof BillingAddressSchema>

export const ProviderResultSchema = z.object({
  success: z.boolean(),
  providerPaymentId: z.string().optional(),
  providerTransactionId: z.string().optional(),
  status: z.string(),
  rawResponse: z.record(z.string(), z.any()).optional(),
  error: z.string().optional(),
})
export type ProviderResult = z.infer<typeof ProviderResultSchema>

export interface NormalizedWebhookEvent {
  action: z.infer<typeof WebhookEventTypeEnum>
  providerPaymentId: string
  tenantId?: string
  amount?: number
  currency?: string
  metadata?: Record<string, string | undefined>
  failureCode?: string
  failureMessage?: string
  rawEvent: unknown
}

export interface ProviderCapabilities {
  oneTime: boolean
  subscription: boolean
  customerPortal: boolean
  refunds: boolean
}

export type WebhookHandler = (event: NormalizedWebhookEvent, provider: z.infer<typeof PaymentProviderEnum>) => Promise<void>
