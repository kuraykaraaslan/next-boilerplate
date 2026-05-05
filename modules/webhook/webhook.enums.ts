import { z } from 'zod';

// ─── Tenant-scoped events ─────────────────────────────────────────────────────

export const WebhookEventEnum = z.enum([
  'tenant.updated',
  'member.created',
  'member.updated',
  'member.deleted',
  'invitation.sent',
  'invitation.accepted',
  'invitation.declined',
  'invitation.revoked',
  'subscription.created',
  'subscription.updated',
  'subscription.cancelled',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'api_key.created',
  'api_key.deleted',
]);

export type WebhookEvent = z.infer<typeof WebhookEventEnum>;
export const WEBHOOK_EVENTS: WebhookEvent[] = WebhookEventEnum.options;

// ─── System-scoped events ─────────────────────────────────────────────────────

export const SystemWebhookEventEnum = z.enum([
  'user.created',
  'user.updated',
  'user.deleted',
  'user.suspended',
  'tenant.created',
  'tenant.updated',
  'tenant.deleted',
  'tenant.suspended',
  'plan.created',
  'plan.updated',
  'plan.deleted',
  'subscription.assigned',
  'subscription.updated',
  'subscription.cancelled',
]);

export type SystemWebhookEvent = z.infer<typeof SystemWebhookEventEnum>;
export const SYSTEM_WEBHOOK_EVENTS: SystemWebhookEvent[] = SystemWebhookEventEnum.options;

// ─── Shared ───────────────────────────────────────────────────────────────────

export const WebhookDeliveryStatusEnum = z.enum(['PENDING', 'SUCCESS', 'FAILED']);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusEnum>;
