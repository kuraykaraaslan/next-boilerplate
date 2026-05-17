# Outgoing Webhooks

- **id:** `webhook`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/webhook/`
- **tags:** platform, integration
- **icon:** `fas fa-rss`
- **hasNextLayer:** false

Subscriber-configured outbound webhooks (system + tenant scope), signed deliveries, retry+redelivery.

## Dependencies

- **requires:** `db`, `redis`, `env`

## Services

- `webhook.service.ts`
- `webhook.system.service.ts`

## DTOs

- `webhook.dto.ts`

## Entities

- `system_webhook.entity.ts`
- `system_webhook_delivery.entity.ts`
- `webhook.entity.ts`
- `webhook_delivery.entity.ts`

## Enums

- `webhook.enums.ts`

## Message keys

- `webhook.messages.ts`

## Owned API routes

- `system` POST `/system/api/webhooks/iyzico`
- `system` GET/POST `/system/api/webhooks/outgoing`
- `system` GET/PATCH/DELETE `/system/api/webhooks/outgoing/[webhookId]`
- `system` GET `/system/api/webhooks/outgoing/[webhookId]/deliveries`
- `system` POST `/system/api/webhooks/outgoing/[webhookId]/deliveries/[deliveryId]/redeliver`
- `system` POST `/system/api/webhooks/outgoing/[webhookId]/test`
- `system` POST `/system/api/webhooks/paypal`
- `system` POST `/system/api/webhooks/stripe`
- `tenant` GET/POST `/tenant/[tenantId]/api/webhooks`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/webhooks/[webhookId]`
- `tenant` GET `/tenant/[tenantId]/api/webhooks/[webhookId]/deliveries`
- `tenant` POST `/tenant/[tenantId]/api/webhooks/[webhookId]/deliveries/[deliveryId]/redeliver`
- `tenant` POST `/tenant/[tenantId]/api/webhooks/[webhookId]/test`

## TypeORM entities

- `SystemWebhook` (tenant) — `modules/webhook/entities/system_webhook.entity.ts`
- `SystemWebhookDelivery` (tenant) — `modules/webhook/entities/system_webhook_delivery.entity.ts`
- `Webhook` (tenant) — `modules/webhook/entities/webhook.entity.ts`
- `WebhookDelivery` (tenant) — `modules/webhook/entities/webhook_delivery.entity.ts`

## README

# Webhook Module

Outgoing webhook system. Tenant admins configure HTTP endpoints and subscribe to events. When an event fires, the system signs and delivers a JSON payload to all matching endpoints.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `Webhook` | `webhooks` | Endpoint configuration per tenant |
| `WebhookDelivery` | `webhook_deliveries` | Delivery attempt log |

Both live in the **tenant DB**.

---

## Events

| Event | Fired when |
|---|---|
| `tenant.updated` | Tenant name/settings change |
| `member.created/updated/deleted` | Tenant membership changes |
| `invitation.sent/accepted/declined/revoked` | Invitation lifecycle |
| `subscription.created/updated/cancelled` | Subscription lifecycle |
| `payment.completed/failed/refunded` | Payment lifecycle |
| `api_key.created/deleted` | API key management |

---

## API Routes (tenant-scoped, ADMIN+)

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[id]/api/webhooks` | List endpoints |
| POST | `/tenant/[id]/api/webhooks` | Create endpoint |
| GET | `/tenant/[id]/api/webhooks/[wid]` | Get endpoint |
| PATCH | `/tenant/[id]/api/webhooks/[wid]` | Update endpoint |
| DELETE | `/tenant/[id]/api/webhooks/[wid]` | Delete endpoint |
| POST | `/tenant/[id]/api/webhooks/[wid]/test` | Send test delivery (sync) |
| GET | `/tenant/[id]/api/webhooks/[wid]/deliveries` | List deliveries |
| POST | `/tenant/[id]/api/webhooks/[wid]/deliveries/[did]/redeliver` | Re-queue failed delivery |

---

## Security

Every request carries an `X-Webhook-Signature: sha256=<hmac>` header.
The HMAC is computed as `HMAC-SHA256(secret, requestBody)`.
The secret is generated per endpoint and never returned via the API.

### Verification example (Node.js)

```typescript
import crypto from 'crypto';

function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

---

## Delivery

- Queue: BullMQ (`webhookDeliveryQueue`), concurrency 10
- Timeout: 15 seconds per attempt
- Max attempts: 3
- Backoff: exponential — 60s → 5min → 15min
- Delivery record updated after each attempt with status, HTTP code, response body (truncated to 4 KB), and duration

---

## Dispatching from other modules

```typescript
import WebhookService from '@/modules/webhook/webhook.service';

// Call after a member is created:
await WebhookService.dispatchEvent(tenantId, 'member.created', {
  tenantMemberId: member.tenantMemberId,
  userId: member.userId,
  role: member.memberRole,
});
```

`dispatchEvent` is fire-and-forget safe — it catches internal errors and logs them without throwing.
