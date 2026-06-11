import type { WebhookEvent } from './webhook.enums';

/**
 * Single source of truth for webhook event metadata — scope, UI grouping,
 * human label, and description. Both the admin event picker and the
 * `GET /tenant/[id]/api/webhooks/events` endpoint consume this catalog so the
 * two can never drift.
 *
 * Typing the catalog as `Record<WebhookEvent, …>` makes parity a *compile-time*
 * guarantee: adding an event to `WebhookEventEnum` without a catalog entry (or
 * vice-versa) fails the type-check. Keep the enum the runtime validator and the
 * catalog its descriptive companion.
 */

export type WebhookEventScope = 'tenant' | 'platform';

export interface WebhookEventMeta {
  /** Which webhooks receive this event — a regular tenant's, or the root/platform tenant's. */
  scope: WebhookEventScope;
  /** UI grouping label for the event picker. */
  group: string;
  /** Short human label. */
  label: string;
  /** One-line description of when the event fires. */
  description: string;
}

export interface WebhookEventCatalogEntry extends WebhookEventMeta {
  event: WebhookEvent;
}

export const WEBHOOK_EVENT_CATALOG: Record<WebhookEvent, WebhookEventMeta> = {
  // ─── Tenant-scoped ──────────────────────────────────────────────────────────
  'tenant.updated':         { scope: 'tenant', group: 'Tenant',        label: 'Tenant updated',        description: 'The tenant profile or settings changed.' },
  'member.created':         { scope: 'tenant', group: 'Members',       label: 'Member added',          description: 'A user joined the tenant.' },
  'member.updated':         { scope: 'tenant', group: 'Members',       label: 'Member updated',        description: "A member's role or status changed." },
  'member.deleted':         { scope: 'tenant', group: 'Members',       label: 'Member removed',        description: 'A member was removed from the tenant.' },
  'invitation.sent':        { scope: 'tenant', group: 'Invitations',   label: 'Invitation sent',       description: 'An invitation was sent to an email.' },
  'invitation.accepted':    { scope: 'tenant', group: 'Invitations',   label: 'Invitation accepted',   description: 'An invitation was accepted and a member created.' },
  'invitation.declined':    { scope: 'tenant', group: 'Invitations',   label: 'Invitation declined',   description: 'An invitation was declined.' },
  'invitation.revoked':     { scope: 'tenant', group: 'Invitations',   label: 'Invitation revoked',    description: 'A pending invitation was revoked by an admin.' },
  'subscription.created':   { scope: 'tenant', group: 'Subscriptions', label: 'Subscription created',  description: 'A subscription was created for a customer.' },
  'subscription.updated':   { scope: 'tenant', group: 'Subscriptions', label: 'Subscription updated',  description: 'A subscription plan or billing cycle changed.' },
  'subscription.cancelled': { scope: 'tenant', group: 'Subscriptions', label: 'Subscription cancelled', description: 'A subscription was cancelled.' },
  'subscription.paused':    { scope: 'tenant', group: 'Subscriptions', label: 'Subscription paused',    description: 'A subscription was paused.' },
  'subscription.resumed':   { scope: 'tenant', group: 'Subscriptions', label: 'Subscription resumed',   description: 'A paused subscription was resumed.' },
  'subscription.past_due':  { scope: 'tenant', group: 'Subscriptions', label: 'Subscription past due',  description: 'A renewal charge failed and the subscription entered past-due state.' },
  'payment.completed':      { scope: 'tenant', group: 'Payments',      label: 'Payment completed',     description: 'A payment succeeded.' },
  'payment.failed':         { scope: 'tenant', group: 'Payments',      label: 'Payment failed',        description: 'A payment attempt failed.' },
  'payment.refunded':       { scope: 'tenant', group: 'Payments',      label: 'Payment refunded',      description: 'A payment was refunded.' },
  'invoice.created':        { scope: 'tenant', group: 'Invoices',      label: 'Invoice created',       description: 'A draft invoice was created.' },
  'invoice.issued':         { scope: 'tenant', group: 'Invoices',      label: 'Invoice issued',        description: 'An invoice was finalised and issued.' },
  'invoice.paid':           { scope: 'tenant', group: 'Invoices',      label: 'Invoice paid',          description: 'An invoice was marked paid.' },
  'coupon.created':         { scope: 'tenant', group: 'Coupons',       label: 'Coupon created',        description: 'A coupon was created.' },
  'coupon.updated':         { scope: 'tenant', group: 'Coupons',       label: 'Coupon updated',        description: 'A coupon was updated.' },
  'coupon.redeemed':        { scope: 'tenant', group: 'Coupons',       label: 'Coupon redeemed',       description: 'A coupon was applied/redeemed.' },
  'product.created':        { scope: 'tenant', group: 'Products',      label: 'Product created',       description: 'A store product was created.' },
  'product.updated':        { scope: 'tenant', group: 'Products',      label: 'Product updated',       description: 'A store product was updated.' },
  'product.deleted':        { scope: 'tenant', group: 'Products',      label: 'Product deleted',       description: 'A store product was deleted.' },
  'fulfillment.created':    { scope: 'tenant', group: 'Fulfillment',   label: 'Fulfillment created',   description: 'An order fulfillment was created.' },
  'fulfillment.shipped':    { scope: 'tenant', group: 'Fulfillment',   label: 'Fulfillment shipped',   description: 'A fulfillment was marked shipped.' },
  'fulfillment.delivered':  { scope: 'tenant', group: 'Fulfillment',   label: 'Fulfillment delivered', description: 'A fulfillment was marked delivered.' },
  'fulfillment.cancelled':  { scope: 'tenant', group: 'Fulfillment',   label: 'Fulfillment cancelled', description: 'A fulfillment was cancelled.' },
  'document.signed':        { scope: 'tenant', group: 'E-Signature',   label: 'Document signed',       description: 'An e-signature document was signed.' },
  'identity.verified':      { scope: 'tenant', group: 'E-Signature',   label: 'Identity verified',     description: 'A signer identity was verified.' },
  'api_key.created':        { scope: 'tenant', group: 'API Keys',      label: 'API key created',       description: 'A new API key was issued.' },
  'api_key.deleted':        { scope: 'tenant', group: 'API Keys',      label: 'API key revoked',       description: 'An API key was revoked.' },

  // ─── Platform-wide (root-tenant webhooks only) ──────────────────────────────
  'user.created':           { scope: 'platform', group: 'Users',         label: 'User created',          description: 'A new user account was registered.' },
  'user.updated':           { scope: 'platform', group: 'Users',         label: 'User updated',          description: 'A user profile changed.' },
  'user.deleted':           { scope: 'platform', group: 'Users',         label: 'User deleted',          description: 'A user account was deleted.' },
  'user.suspended':         { scope: 'platform', group: 'Users',         label: 'User suspended',        description: 'A user account was suspended.' },
  'tenant.created':         { scope: 'platform', group: 'Tenants',       label: 'Tenant created',        description: 'A new tenant was provisioned.' },
  'tenant.deleted':         { scope: 'platform', group: 'Tenants',       label: 'Tenant deleted',        description: 'A tenant was deleted.' },
  'tenant.suspended':       { scope: 'platform', group: 'Tenants',       label: 'Tenant suspended',      description: 'A tenant was suspended.' },
  'plan.created':           { scope: 'platform', group: 'Plans',         label: 'Plan created',          description: 'A subscription plan was created.' },
  'plan.updated':           { scope: 'platform', group: 'Plans',         label: 'Plan updated',          description: 'A subscription plan was modified.' },
  'plan.deleted':           { scope: 'platform', group: 'Plans',         label: 'Plan deleted',          description: 'A subscription plan was archived.' },
  'subscription.assigned':  { scope: 'platform', group: 'Subscriptions', label: 'Subscription assigned', description: 'A plan was assigned to a tenant by an admin.' },
};

/** Flat list of every catalog entry, in declaration order. */
export function catalogEntries(): WebhookEventCatalogEntry[] {
  return (Object.keys(WEBHOOK_EVENT_CATALOG) as WebhookEvent[]).map((event) => ({
    event,
    ...WEBHOOK_EVENT_CATALOG[event],
  }));
}

/** Catalog entries visible to a given scope. */
export function catalogForScope(scope: WebhookEventScope): WebhookEventCatalogEntry[] {
  return catalogEntries().filter((e) => e.scope === scope);
}

/**
 * Catalog entries for a scope, grouped for the UI picker. Groups appear in
 * first-seen declaration order; events keep their declaration order within a group.
 */
export function groupedCatalogForScope(
  scope: WebhookEventScope,
): { group: string; events: WebhookEventCatalogEntry[] }[] {
  const groups: { group: string; events: WebhookEventCatalogEntry[] }[] = [];
  const byName = new Map<string, WebhookEventCatalogEntry[]>();
  for (const entry of catalogForScope(scope)) {
    let bucket = byName.get(entry.group);
    if (!bucket) {
      bucket = [];
      byName.set(entry.group, bucket);
      groups.push({ group: entry.group, events: bucket });
    }
    bucket.push(entry);
  }
  return groups;
}

/** Resolve the scope for a tenant id: the root tenant sees platform events. */
export function scopeForTenant(isRoot: boolean): WebhookEventScope {
  return isRoot ? 'platform' : 'tenant';
}
