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
| `subscription.paused/resumed` | tenant | Subscription pause/resume |
| `payment.completed/failed/refunded` | tenant | Payment lifecycle |
| `invoice.created/issued/paid` | tenant | Invoice lifecycle |
| `coupon.created/updated/redeemed` | tenant | Coupon lifecycle |
| `product.created/updated/deleted` | tenant | Store product changes |
| `fulfillment.created/shipped/delivered/cancelled` | tenant | Order fulfillment lifecycle |
| `document.signed` / `identity.verified` | tenant | E-signature / identity verification |
| `api_key.created/deleted` | tenant | API key management |
| `user.created/updated/deleted/suspended` | platform | Global user lifecycle |
| `tenant.created/deleted/suspended` | platform | Tenant lifecycle |
| `plan.created/updated/deleted` | platform | Subscription plan changes |
| `subscription.assigned` | platform | Plan assignment from admin panel |

`webhook.catalog.ts` is the single source of truth for event metadata (scope,
group, label, description). It is typed `Record<WebhookEvent, …>`, so the enum
and catalog cannot drift — adding an event to one without the other fails the
type-check. Both the admin event picker and `GET …/webhooks/events` consume it.

---

## API Routes (tenant-scoped, ADMIN+)

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[id]/api/webhooks/events` | List subscribable events for this tenant's scope |
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
- Timeout, max attempts, and backoff are **per-tenant settings** (see *Settings*); the values below are the defaults:
  - Timeout: 15 seconds per attempt (`webhookRequestTimeoutMs`)
  - Max attempts: 3 (`webhookMaxAttempts`)
  - Backoff: exponential — 60s → 5min → 15min (`webhookRetryDelaysMs`)
- Delivery record updated after each attempt with status, HTTP code, response body (truncated to 4 KB), and duration

---

## Endpoint configuration

Each endpoint supports optional per-webhook configuration (DB columns added in
`003_webhook_endpoint_capabilities.sql`):

| Field | Purpose |
|---|---|
| `headers` | Extra HTTP headers merged into every request. **Reserved** names (`Content-Type`, `Content-Length`, `Host`, `User-Agent`, `X-Webhook-*`) are rejected at the DTO layer **and** stripped again in `_executeDelivery` (defense in depth). Header values are validated single-line (no CR/LF). |
| `eventFilters` | `{ "<event>": { "<dot.path>": value } }`. Before enqueue, the event's payload is matched against the filter for that event — non-matching deliveries are skipped. Events with no filter always deliver. |
| `tags` | Free-form labels for organising endpoints in the admin UI. |

All three are editable from the create/edit modal on the Webhooks admin page and
never expose the signing secret (`SafeWebhook`).

---

## Reliability

- **Per-endpoint rate limit** (`rateLimitPerMinute`, or the `webhookDefaultRateLimitPerMinute`
  setting as fallback): a sliding-window limiter (`checkWebhookRateLimit`, reusing the
  tenant-plan zset algorithm). When an endpoint is over its limit the delivery is **deferred**
  ~60s via a BullMQ delay rather than dropped.
- **Circuit breaker**: `consecutiveFailures` increments on each failed delivery and resets on
  success. When it reaches `webhookCircuitBreakerThreshold` (default 10) the endpoint is
  **auto-disabled** (`isActive=false`, `autoDisabledAt` set) and stops receiving events. The
  admin UI shows an *Auto-disabled* badge; toggling the endpoint back on clears the breaker
  (resets the counter and `autoDisabledAt`).

---

## Dispatching from other modules

```typescript
import WebhookService from '@/modules/webhook/webhook.service';

// Tenant-scoped event — call after a member is created:
await WebhookService.dispatchEvent(tenantId, 'member.created', {
  tenantMemberId: member.tenantMemberId,
  userId: member.userId,
  role: member.memberRole,
});

// Platform-wide event (user.*, tenant.*, plan.*, subscription.assigned) —
// routes to root-tenant webhooks without threading ROOT_TENANT_ID by hand:
await WebhookService.dispatchPlatformEvent('user.created', {
  userId: user.userId,
  email: user.email,
});
```

`dispatchEvent` / `dispatchPlatformEvent` are fire-and-forget safe — they catch internal errors and log them without throwing, so a webhook failure never breaks the producing operation. Dispatch **after** the DB commit so a rolled-back operation cannot emit a phantom event.

These are already wired into the user, tenant, tenant_member, tenant_invitation, api_key, payment (inbound provider webhooks), tenant_subscription (plans + assignment), and payment_subscription (subscription lifecycle) services.

---

## Settings

Surfaced at `/tenant/[tenantId]/admin/webhooks/settings` (gear button in the Webhooks page header) via the shared `ModuleSettingsPage` scaffold. UI field metadata: `webhook.settings.fields.ts`. The global worker-pool knob (`webhookWorkerConcurrency`) is intentionally **not** exposed here — it is a shared resource, not a per-tenant setting.

| Key | Type | Default | Notes |
|---|---|---|---|
| `webhookMaxAttempts` | number | `3` | Retries before a delivery is marked failed. |
| `webhookRetryDelaysMs` | text (CSV) | `60000,300000,900000` | Backoff delays between retries (ms). |
| `webhookRequestTimeoutMs` | number | `15000` | Per-delivery request timeout (ms). |

`webhook.service.ts` reads these per tenant at dispatch/delivery time via `SettingService.getByKeys` (Redis-cached), with the defaults above as fallback for any missing or unparseable value (`_resolveDeliveryConfig`). Read/written via `GET/PUT /tenant/[tenantId]/api/admin-settings`. See `docs/ROADMAP_SETTINGS.md`.
