import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { SEED_ADMIN_USER_ID, SEED_ORDER_ID } from '@/modules/seed/seed.context';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook_delivery.entity';

/**
 * Webhook demo seed.
 *
 * Both entities carry a `tenantId` column, so everything is tenant-scoped via
 * `ctx.repo(...)`. Natural keys:
 *  - Webhook:         (tenantId, name)            — endpoints are named per tenant
 *  - WebhookDelivery: (tenantId, webhookId, event)— one demo delivery per event
 *
 * Valid enum values only:
 *  - events come from WebhookEventEnum (tenant.updated, member.created, …)
 *  - delivery status is PENDING | SUCCESS | FAILED (DEAD_LETTERED is *not* in
 *    the WebhookDeliveryStatusEnum, so we never emit it).
 */
export async function seedWebhook(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const minsFromNow = (n: number) => new Date(now.getTime() + n * 60 * 1000);

  // Cross-module ids (bare uuids — no cross-DB FKs). Prefer published refs.
  const adminUserId = (refs.adminUserId as string) ?? SEED_ADMIN_USER_ID;
  const orderId = (refs.orderId as string) ?? SEED_ORDER_ID;
  const paymentId = (refs.paymentId as string) ?? 'c1000000-0000-4000-8000-000000000001';

  const webhookRepo = ctx.repo<Webhook>(Webhook);
  const deliveryRepo = ctx.repo<WebhookDelivery>(WebhookDelivery);

  // ── Webhooks (active commerce endpoint / mid-rotation endpoint / disabled) ──
  // 1) Active endpoint subscribed to the commerce lifecycle.
  const commerceHook = await foc(webhookRepo,
    { tenantId, name: 'Commerce events' } as FindOptionsWhere<Webhook>,
    {
      tenantId,
      createdByUserId: adminUserId,
      name: 'Commerce events',
      description: 'Forwards subscription and payment events to the billing service.',
      url: 'https://hooks.example.com/test/commerce',
      secret: 'whsec_test_commerce_5f3a9c1d2e4b6a8f',
      events: [
        'subscription.created',
        'subscription.updated',
        'subscription.cancelled',
        'payment.completed',
        'payment.failed',
        'payment.refunded',
      ],
      isActive: true,
    },
  );

  // 2) Endpoint inside a secret-rotation window (previousSecret still valid).
  const membershipHook = await foc(webhookRepo,
    { tenantId, name: 'Membership sync' } as FindOptionsWhere<Webhook>,
    {
      tenantId,
      createdByUserId: adminUserId,
      name: 'Membership sync',
      description: 'Mirrors member and invitation changes into the CRM. Rotating its signing secret.',
      url: 'https://hooks.example.com/test/membership',
      secret: 'whsec_test_member_new_a1b2c3d4e5f60718',
      previousSecret: 'whsec_test_member_old_99887766554433',
      previousSecretExpiresAt: minsFromNow(60 * 24), // old secret valid for ~24h
      events: [
        'member.created',
        'member.updated',
        'member.deleted',
        'invitation.sent',
        'invitation.accepted',
        'invitation.declined',
        'invitation.revoked',
        'tenant.updated',
      ],
      isActive: true,
    },
  );

  // 3) Disabled endpoint kept for documentation/audit purposes.
  await foc(webhookRepo,
    { tenantId, name: 'Legacy Zapier (disabled)' } as FindOptionsWhere<Webhook>,
    {
      tenantId,
      createdByUserId: adminUserId,
      name: 'Legacy Zapier (disabled)',
      description: 'Deprecated Zapier integration. Disabled but retained for audit.',
      url: 'https://hooks.zapier.com/test/legacy/abc123',
      secret: 'whsec_test_legacy_0011223344556677',
      events: ['api_key.created', 'api_key.deleted'],
      isActive: false,
    },
  );

  // ── Deliveries (SUCCESS / FAILED-retrying / PENDING) ────────────────────────
  type DeliveryDef = {
    webhookId: string;
    event: string;
    payload: Record<string, unknown>;
    status: string; // PENDING | SUCCESS | FAILED
    attempts: number;
    maxAttempts: number;
    requestBody: string;
    responseStatus: number | null;
    responseBody: string | null;
    errorMessage: string | null;
    duration: number | null;
    nextRetryAt: Date | null;
    createdAt: Date;
  };

  const paymentCompletedPayload = {
    event: 'payment.completed',
    paymentId,
    orderId,
    amount: 29,
    currency: 'USD',
    status: 'COMPLETED',
  };
  const subscriptionUpdatedPayload = {
    event: 'subscription.updated',
    orderId,
    plan: 'pro',
    interval: 'monthly',
    status: 'ACTIVE',
  };
  const memberCreatedPayload = {
    event: 'member.created',
    memberId: '11111111-0000-4000-8000-000000000001',
    userId: adminUserId,
    role: 'MEMBER',
  };

  const deliveryDefs: DeliveryDef[] = [
    // Delivered cleanly on the first try.
    {
      webhookId: commerceHook.webhookId,
      event: 'payment.completed',
      payload: paymentCompletedPayload,
      status: 'SUCCESS',
      attempts: 1,
      maxAttempts: 3,
      requestBody: JSON.stringify(paymentCompletedPayload),
      responseStatus: 200,
      responseBody: '{"received":true}',
      errorMessage: null,
      duration: 142,
      nextRetryAt: null,
      createdAt: daysAgo(2),
    },
    // Receiver returned 5xx — recoverable, will retry until attempts === max.
    {
      webhookId: commerceHook.webhookId,
      event: 'subscription.updated',
      payload: subscriptionUpdatedPayload,
      status: 'FAILED',
      attempts: 2,
      maxAttempts: 3,
      requestBody: JSON.stringify(subscriptionUpdatedPayload),
      responseStatus: 503,
      responseBody: 'Service Unavailable',
      errorMessage: 'Upstream returned HTTP 503',
      duration: 5021,
      nextRetryAt: minsFromNow(15),
      createdAt: daysAgo(1),
    },
    // Just enqueued, not attempted yet.
    {
      webhookId: membershipHook.webhookId,
      event: 'member.created',
      payload: memberCreatedPayload,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 5,
      requestBody: JSON.stringify(memberCreatedPayload),
      responseStatus: null,
      responseBody: null,
      errorMessage: null,
      duration: null,
      nextRetryAt: null,
      createdAt: now,
    },
  ];

  for (const d of deliveryDefs) {
    await foc(deliveryRepo,
      { tenantId, webhookId: d.webhookId, event: d.event } as FindOptionsWhere<WebhookDelivery>,
      { tenantId, ...d },
    );
  }

  // ── Publish references later modules might consume ──────────────────────────
  refs.webhookId = commerceHook.webhookId;

  ctx.log(`webhook: 3 webhooks, 3 deliveries (SUCCESS/FAILED/PENDING) for ${tenantId}`);
}
