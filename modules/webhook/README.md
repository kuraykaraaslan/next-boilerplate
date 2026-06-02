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

---

## Settings

Surfaced at `/tenant/[tenantId]/admin/webhooks/settings` (gear button in the Webhooks page header) via the shared `ModuleSettingsPage` scaffold. UI field metadata: `webhook.settings.fields.ts`. The global worker-pool knob (`webhookWorkerConcurrency`) is intentionally **not** exposed here — it is a shared resource, not a per-tenant setting.

| Key | Type | Default | Notes |
|---|---|---|---|
| `webhookMaxAttempts` | number | `3` | Retries before a delivery is marked failed. |
| `webhookRetryDelaysMs` | text (CSV) | `60000,300000,900000` | Backoff delays between retries (ms). |
| `webhookRequestTimeoutMs` | number | `15000` | Per-delivery request timeout (ms). |

**Phase 2:** `webhook.service.ts` reads these per tenant (with the defaults above as fallback) instead of the hardcoded values in *Delivery*. Read/written via `GET/PUT /tenant/[tenantId]/api/admin-settings`. See `docs/ROADMAP_SETTINGS.md`.
