import { z } from 'zod';
import { WebhookEventEnum, SystemWebhookEventEnum, WebhookDeliveryStatusEnum } from './webhook.enums';

// ─── Tenant webhook ───────────────────────────────────────────────────────────

export const WebhookSchema = z.object({
  webhookId: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  secret: z.string(),
  events: z.array(WebhookEventEnum),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SafeWebhookSchema = WebhookSchema.omit({ secret: true });

export type Webhook = z.infer<typeof WebhookSchema>;
export type SafeWebhook = z.infer<typeof SafeWebhookSchema>;

// ─── System webhook ───────────────────────────────────────────────────────────

export const SystemWebhookSchema = z.object({
  webhookId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  secret: z.string(),
  events: z.array(SystemWebhookEventEnum),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SafeSystemWebhookSchema = SystemWebhookSchema.omit({ secret: true });

export type SystemWebhook = z.infer<typeof SystemWebhookSchema>;
export type SafeSystemWebhook = z.infer<typeof SafeSystemWebhookSchema>;

// ─── Delivery (shared shape, tenantId optional) ───────────────────────────────

export const WebhookDeliverySchema = z.object({
  deliveryId: z.string().uuid(),
  webhookId: z.string().uuid(),
  tenantId: z.string().uuid().nullable().optional(),
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
