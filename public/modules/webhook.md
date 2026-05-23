# Outgoing Webhooks

- **id:** `webhook`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/webhook/`
- **tags:** platform, integration
- **icon:** `fas fa-rss`
- **hasNextLayer:** false

Subscriber-configured outbound webhooks (tenant-scoped; root tenant carries platform-wide events), signed deliveries, retry+redelivery.

## Dependencies

- **requires:** `db`, `redis`, `env`

## Services

- `webhook.service.ts`

## DTOs

- `webhook.dto.ts`

## Entities

- `webhook.entity.ts`
- `webhook_delivery.entity.ts`

## Enums

- `webhook.enums.ts`

## Message keys

- `webhook.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/webhooks`
- `tenant` GET/PATCH/DELETE `/tenant/[tenantId]/api/webhooks/[webhookId]`
- `tenant` GET `/tenant/[tenantId]/api/webhooks/[webhookId]/deliveries`
- `tenant` POST `/tenant/[tenantId]/api/webhooks/[webhookId]/deliveries/[deliveryId]/redeliver`
- `tenant` POST `/tenant/[tenantId]/api/webhooks/[webhookId]/deliveries/replay-dead-letter`
- `tenant` POST `/tenant/[tenantId]/api/webhooks/[webhookId]/rotate-secret`
- `tenant` POST `/tenant/[tenantId]/api/webhooks/[webhookId]/test`

## TypeORM entities

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

A single `WebhookEventEnum` covers both tenant-local and platform-wide
events. Every event is delivered only to webhooks owned by the appropriate
tenant — platform-wide events fire on root-tenant webhooks
(`tenantId = ROOT_TENANT_ID`); tenant-local events fire on regular tenant
webhooks.

| Event | Scope | Fired when |
|---|---|---|
| `tenant.updated` | tenant | Tenant name/settings change |
| `member.created/updated/deleted` | tenant | Tenant membership changes |
| `invitation.sent/accepted/declined/revoked` | tenant | Invitation lifecycle |
| `subscription.created/updated/cancelled` | tenant | Subscription lifecycle |
| `payment.completed/failed/refunded` | tenant | Payment lifecycle |
| `api_key.created/deleted` | tenant | API key management |
| `user.created/updated/deleted/suspended` | platform | Global user lifecycle |
| `tenant.created/deleted/suspended` | platform | Tenant lifecycle |
| `plan.created/updated/deleted` | platform | Subscription plan changes |
| `subscription.assigned` | platform | Plan assignment from admin panel |

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

### Platform webhooks (root-tenant admins only)

Mirror the routes above under `/tenant/[ROOT_TENANT_ID]/api/webhooks/...`.
The handlers require root-tenant admin auth and bind every operation to
`tenantId = ROOT_TENANT_ID`. There is no separate service or table —
`WebhookService` and the `Webhook`/`WebhookDelivery` tables back both
surfaces.

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
