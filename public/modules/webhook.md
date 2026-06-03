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
- `tenant` POST `/tenant/[tenantId]/api/webhooks/[webhookId]/trigger`
- `tenant` GET `/tenant/[tenantId]/api/webhooks/events`
- `tenant` GET `/tenant/[tenantId]/api/webhooks/metrics`

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
| GET | `/tenant/[id]/api/webhooks/metrics` | Delivery metrics (`?webhookId=&days=`) |
| GET | `/tenant/[id]/api/webhooks` | List endpoints |
| POST | `/tenant/[id]/api/webhooks` | Create endpoint |
| GET | `/tenant/[id]/api/webhooks/[wid]` | Get endpoint |
| PATCH | `/tenant/[id]/api/webhooks/[wid]` | Update endpoint |
| DELETE | `/tenant/[id]/api/webhooks/[wid]` | Delete endpoint |
| POST | `/tenant/[id]/api/webhooks/[wid]/test` | Send test delivery (sync, `event:'test'`) |
| POST | `/tenant/[id]/api/webhooks/[wid]/trigger` | Trigger a real catalog event with a sample payload (async) |
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

Every request carries HMAC signature headers (secret is per-endpoint, never returned via the API):

| Header | Signed value | Notes |
|---|---|---|
| `X-Webhook-Signature` | `HMAC-SHA256(secret, body)` | **v1**, legacy — kept during a deprecation window |
| `X-Webhook-Signature-V2` | `HMAC-SHA256(secret, "<timestamp>.<body>")` | **v2**, replay-resistant (preferred) |
| `X-Webhook-Timestamp` | unix seconds | bind the signature to a time; reject stale deliveries |
| `X-Webhook-Signature-Prev` / `-V2-Prev` | as above with the previous secret | only during a secret-rotation window |

**SSRF protection:** webhook URLs are user-controlled, so deliveries are guarded
(`webhook.ssrf.ts`). The destination host is checked at create/update time (sync,
no-DNS pre-check) **and** at delivery time (authoritative DNS resolution, rebinding-
resistant). Private / loopback / link-local / metadata ranges (127/8, 10/8,
172.16/12, 192.168/16, 169.254/16, `::1`, `fc00::/7`, `fe80::/10`, …) are blocked,
redirects are not followed (`redirect: 'manual'`), and an explicit per-webhook
`ipAllowlist` (IPs/CIDRs) is the override for intentionally-internal targets.

### Verification example (Node.js, v2)

```typescript
import crypto from 'crypto';

function verifyWebhook(body: string, timestamp: string, signatureV2: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  // Reject deliveries older than 5 minutes to blunt replay.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureV2));
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

## Observability & manual trigger

- **Metrics** (`WebhookService.getMetrics`, `GET …/webhooks/metrics`): counts by status,
  success rate over terminal deliveries, average + p95 latency (`PERCENTILE_CONT`), and a
  per-event breakdown over a time window. Surfaced as stat cards on the Webhooks admin page.
- **Manual trigger** (`WebhookService.triggerEvent`, `POST …/webhooks/[wid]/trigger`): enqueue a
  real `<event>` delivery with an admin-supplied sample payload to verify an integration
  end-to-end — distinct from `/test` (which sends `event:'test'` synchronously). Available from
  the row actions menu ("Trigger event…").

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
| `webhookMaxAttempts` | number | `3` | Retries before a delivery is dead-lettered (clamped 1-10). |
| `webhookRetryDelaysMs` | text (CSV) | `60000,300000,900000` | Backoff delays between retries (ms). |
| `webhookRequestTimeoutMs` | number | `15000` | Per-delivery request timeout (ms, clamped 1000-120000). |
| `webhookCircuitBreakerThreshold` | number | `10` | Consecutive failures before an endpoint auto-disables (clamped 1-100000). |
| `webhookDefaultRateLimitPerMinute` | number | — | Fallback per-endpoint rate limit (deliveries/min) when a webhook has none; blank = unlimited. |

`webhook.service.ts` reads these per tenant at dispatch/delivery time via `SettingService.getByKeys` (Redis-cached), with the defaults above as fallback for any missing or unparseable value (`_resolveDeliveryConfig`). Read/written via `GET/PUT /tenant/[tenantId]/api/admin-settings`. See `docs/ROADMAP_SETTINGS.md`.

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A tenant-scoped outbound webhook system (subscriptions, signed/retried async deliveries, circuit breaker, metrics) where each real tenant owns its endpoints and deliveries and overrides delivery tuning via settings, with the root tenant holding platform-wide event webhooks.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `webhookMaxAttempts` | number | `3` | tenant | How many delivery attempts before a delivery is dead-lettered (clamped 1-10); written into each delivery's maxAttempts and the BullMQ job attempts. | `webhook.service.ts` |
| `webhookRetryDelaysMs` | text | `60000,300000,900000` | tenant | Comma-separated exponential backoff delays (ms) between retries; first value seeds BullMQ backoff, subsequent values pick nextRetryAt per attempt. | `webhook.service.ts` |
| `webhookRequestTimeoutMs` | number | `15000` | tenant | Per-request HTTP timeout for a delivery (clamped 1000-120000ms) via AbortSignal.timeout. | `webhook.service.ts` |
| `webhookCircuitBreakerThreshold` | number | `10` | tenant | Consecutive failed deliveries before an endpoint is auto-disabled (clamped 1-100000); a success resets the counter. | `webhook.service.ts` |
| `webhookDefaultRateLimitPerMinute` | number | — | tenant | Fallback per-endpoint delivery rate limit (deliveries/min) applied when a webhook row has no rateLimitPerMinute; blank/<=0 means unlimited. | `webhook.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Webhook` | `webhooks` | url, secret, previousSecret, previousSecretExpiresAt, events, headers, eventFilters, tags, isActive, consecutiveFailures, autoDisabledAt, ipAllowlist, rateLimitPerMinute, name, description |
| `WebhookDelivery` | `webhook_deliveries` | event, payload, status, attempts, maxAttempts, requestBody, responseStatus, responseBody, errorMessage, duration, nextRetryAt |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `webhook.service.ts:dispatchEvent / hasWebhookFeature` — Webhook dispatch is feature-gated per tenant: tenants whose active plan lacks the feature_webhooks subscription feature get no enqueue and no delivery; root tenant is short-circuited as always-allowed.
- `webhook.service.ts:_resolveDeliveryConfig` — Max attempts, retry backoff delays, request timeout, circuit-breaker threshold, and default rate limit are all resolved per tenantId from SettingService (with module defaults as fallback), so delivery reliability/timing differs per tenant.
- `webhook.service.ts:_enqueueDelivery` — Per-endpoint sliding-window rate limit: effective limit is webhook.rateLimitPerMinute or the tenant's webhookDefaultRateLimitPerMinute; when exceeded the delivery is deferred ~60s rather than enqueued immediately.
- `webhook.service.ts:_passesEventFilter` — Per-endpoint eventFilters (dot-path equality conditions) decide whether a matching event is actually delivered, so two tenants/endpoints subscribed to the same event can receive different subsets.
- `webhook.service.ts:_applyCircuitBreaker` — Endpoints are auto-disabled once consecutiveFailures crosses the tenant-configured circuit-breaker threshold; the threshold and thus disable behavior varies per tenant.
- `webhook.service.ts:_executeDelivery / webhook.ssrf.ts` — Per-endpoint custom headers are merged (reserved names stripped) and the per-endpoint ipAllowlist overrides the default SSRF private/reserved-range block, so destination policy differs per webhook.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| BullMQ delivery worker concurrency is hardcoded to 10 in the shared WORKER definition. | `webhook.service.ts (WebhookService.WORKER concurrency: 10)` | Intentionally global shared infrastructure (a single process-wide worker pool serves all tenants), so it is correctly NOT per-tenant; noted only for completeness. A per-tenant fairness/throughput cap would be a separate queue-level concern, not this knob. | — |
| Secret rotation overlap window is a hardcoded 48h default parameter (overlapMs) rather than a tenant setting. | `webhook.service.ts:rotateSecret (overlapMs default 48*60*60*1000)` | How long the previous signing secret stays valid during rotation is a security/operability tradeoff that some tenants may want longer or shorter; today it is a fixed default with no per-tenant override surfaced in settings. | `webhookSecretRotationOverlapMs` |
| Rate-limit deferral delay when an endpoint is over its limit is hardcoded to 60000ms. | `webhook.service.ts:_enqueueDelivery (deferDelayMs = 60_000)` | The deferral window is tied conceptually to the per-minute rate limit but is a fixed constant; tenants tuning rate limits cannot adjust how long over-limit deliveries are deferred. | `webhookRateLimitDeferMs` |
| Response body capture cap is hardcoded to 4096 bytes. | `webhook.service.ts:_executeDelivery (responseBody slice(0, 4096))` | How much of the subscriber response is persisted for debugging is a per-tenant storage/observability tradeoff; currently global with no override. | `webhookResponseBodyMaxBytes` |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `webhookWorkerConcurrency` — Global BullMQ worker-pool concurrency (currently hardcoded to 10 in WebhookService.WORKER). Documented as a shared-infra knob deliberately excluded from per-tenant settings; not actually read from the setting store today.
