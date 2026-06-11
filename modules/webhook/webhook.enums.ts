import { z } from 'zod';

/**
 * Webhook event catalog. A single tenant-scoped enum used by every tenant —
 * including the root (platform) tenant, which subscribes to the platform-wide
 * events (user.*, tenant.*, plan.*) via Webhook rows tagged with
 * ROOT_TENANT_ID. A root-tenant webhook can subscribe to e.g.
 * `tenant.created` or `user.suspended` exactly the same way a normal tenant
 * subscribes to `member.created`.
 */
export const WebhookEventEnum = z.enum([
  // ─── Tenant-scoped events (visible to every tenant on their own data) ───
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
  'subscription.paused',
  'subscription.resumed',
  'subscription.past_due',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'invoice.created',
  'invoice.issued',
  'invoice.paid',
  'coupon.created',
  'coupon.updated',
  'coupon.redeemed',
  'product.created',
  'product.updated',
  'product.deleted',
  'fulfillment.created',
  'fulfillment.shipped',
  'fulfillment.delivered',
  'fulfillment.cancelled',
  'document.signed',
  'identity.verified',
  'api_key.created',
  'api_key.updated',
  'api_key.deleted',
  'api_key.expired',
  'api_key.rotated',
  'auth.account_locked',
  'impersonation.started',
  'impersonation.ended',
  'audit.high_risk',

  // ─── Platform-wide events (only emitted to root-tenant webhooks) ─────────
  'user.created',
  'user.updated',
  'user.deleted',
  'user.suspended',
  'tenant.created',
  'tenant.deleted',
  'tenant.suspended',
  'plan.created',
  'plan.updated',
  'plan.deleted',
  'subscription.assigned',
]);

export type WebhookEvent = z.infer<typeof WebhookEventEnum>;
export const WEBHOOK_EVENTS: WebhookEvent[] = WebhookEventEnum.options;

// ─── Shared ───────────────────────────────────────────────────────────────────

export const WebhookDeliveryStatusEnum = z.enum(['PENDING', 'SUCCESS', 'FAILED', 'DEAD_LETTERED']);
export type WebhookDeliveryStatus = z.infer<typeof WebhookDeliveryStatusEnum>;
