import { z } from 'zod';
import { WebhookEventEnum, WebhookDeliveryStatusEnum } from './webhook.enums';

// ─── Webhook (tenant-scoped — root tenant uses tenantId = ROOT_TENANT_ID) ────

export const WebhookSchema = z.object({
  webhookId: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  secret: z.string(),
  previousSecret: z.string().nullable(),
  previousSecretExpiresAt: z.date().nullable(),
  events: z.array(WebhookEventEnum),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Safe view never leaks current OR previous signing secret.
export const SafeWebhookSchema = WebhookSchema.omit({ secret: true, previousSecret: true });

export type Webhook = z.infer<typeof WebhookSchema>;
export type SafeWebhook = z.infer<typeof SafeWebhookSchema>;

// ─── Delivery ────────────────────────────────────────────────────────────────

export const WebhookDeliverySchema = z.object({
  deliveryId: z.string().uuid(),
  webhookId: z.string().uuid(),
  tenantId: z.string().uuid(),
  event: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: WebhookDeliveryStatusEnum,
  attempts: z.number().int(),
  maxAttempts: z.number().int(),
  requestBody: z.string(),
  responseStatus: z.number().int().nullable(),
  responseBody: z.string().nullable(),
  errorMessage: z.string().nullable(),
  duration: z.number().int().nullable(),
  nextRetryAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;
