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
  headers: z.record(z.string(), z.string()).nullable(),
  eventFilters: z.record(z.string(), z.record(z.string(), z.unknown())).nullable(),
  tags: z.array(z.string()).nullable(),
  isActive: z.boolean(),
  consecutiveFailures: z.number().int(),
  autoDisabledAt: z.date().nullable(),
  ipAllowlist: z.array(z.string()).nullable(),
  rateLimitPerMinute: z.number().int().nullable(),
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

// ─── Metrics ───────────────────────────────────────────────────────────────────

export interface WebhookMetrics {
  /** Total deliveries in scope. */
  total: number;
  /** Delivery counts keyed by status (SUCCESS / PENDING / FAILED / DEAD_LETTERED). */
  byStatus: Record<string, number>;
  /** SUCCESS / (terminal deliveries), or null when there are none yet. */
  successRate: number | null;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
  /** Per-event totals + success counts, top 20 by volume. */
  byEvent: { event: string; count: number; success: number }[];
}
