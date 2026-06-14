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
  'subscription.expired',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'invoice.created',
  'invoice.issued',
  'invoice.paid',
  'invoice.credit_note.created',
  'coupon.created',
  'coupon.updated',
  'coupon.redeemed',
  'product.created',
  'product.updated',
  'product.deleted',
  'wishlist.price_drop',
  'wishlist.back_in_stock',
  'fulfillment.created',
  'fulfillment.processing',
  'fulfillment.backordered',
  'fulfillment.packed',
  'fulfillment.shipped',
  'fulfillment.in_transit',
  'fulfillment.delivered',
  'fulfillment.cancelled',
  'fulfillment.returned',
  'document.signed',
  'identity.verified',
  'conversation.created',
  'participant.added',
  'participant.removed',
  'message.created',
  'message.deleted',
  'message.flagged',
  'message.reported',
  'message.moderated',
  'api_key.created',
  'api_key.updated',
  'api_key.deleted',
  'api_key.expired',
  'api_key.expiring',
  'api_key.rotated',
  'auth.account_locked',
  'security.login_anomaly',
  'security.mfa_enabled',
  'security.mfa_disabled',
  'impersonation.started',
  'impersonation.ended',
  'audit.high_risk',
  'wallet.transaction.created',
  'back_office.approval.submitted',
  'back_office.approval.approved',
  'back_office.approval.rejected',
  'back_office.approval.escalated',
  'back_office.ticket.created',
  'back_office.ticket.replied',
  'back_office.ticket.resolved',
  'usage.threshold',
  'usage.overage',
  'metering.usage.recorded',
  'metering.billing.completed',
  'notification.failure_rate_high',
  'page.published',
  'page.invalidated',

  // ─── Platform-wide events (only emitted to root-tenant webhooks) ─────────
  'user.created',
  'user.updated',
  'user.deleted',
  'user.suspended',
  'user.erased',
  'social_account.linked',
  'social_account.unlinked',
  'esignature.cert_expiring',
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
