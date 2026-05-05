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
