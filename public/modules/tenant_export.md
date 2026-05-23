# Tenant Export

- **id:** `tenant_export`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant_export/`
- **tags:** tenant, compliance, gdpr
- **icon:** `fas fa-file-export`
- **hasNextLayer:** false

Export all per-tenant data into a downloadable archive (GDPR-friendly).

## Dependencies

- **requires:** `db`, `tenant`, `storage`

## Services

- `tenant_export.service.ts`

## Owned API routes

- `tenant` POST `/tenant/[tenantId]/api/export`

## README

# tenant_export

GDPR Article 20 (data portability) — allows a tenant OWNER to download all tenant data as a structured JSON file.

## What it does

`TenantExportService.exportTenantData(tenantId)` queries the tenant's own database via `tenantDataSourceFor(tenantId)` and returns a `Buffer` containing a formatted JSON document with the following collections:

| Field                 | Source entity         | Notes                                                          |
|-----------------------|-----------------------|----------------------------------------------------------------|
| `members`             | `TenantMember`        | All member rows (role, status, timestamps)                     |
| `domains`             | `TenantDomain`        | All custom domains and their verification status               |
| `auditLogs`           | `AuditLog`            | Last 1 000 entries, ordered newest-first                       |
| `webhooks`            | `Webhook`             | Endpoint config; **signing secret omitted**                    |
| `webhookDeliveries`   | `WebhookDelivery`     | Per-attempt delivery log (status, response code, retry count)  |
| `settings`            | `Setting`             | All key/value settings rows; `null` if none                    |
| `payments`            | `Payment`             | Payment intents / charges scoped to this tenant                |
| `paymentTransactions` | `PaymentTransaction`  | Provider-side transaction ledger (joined via `Payment.tenantId`) |
| `subscriptions`       | `TenantSubscription`  | Active and historical plan subscriptions                       |
| `subscriptionPlans`   | `SubscriptionPlan`    | Tenant-owned plans (price, interval, currency)                 |
| `planFeatures`        | `PlanFeature`         | Feature flags attached to each plan                            |
| `coupons`             | `Coupon`              | Tenant-owned promo codes                                       |
| `couponRedemptions`   | `CouponRedemption`    | Who redeemed which coupon, when                                |
| `apiKeys`             | `ApiKey`              | API key metadata; **`keyHash` omitted**                        |
| `samlConfigs`         | `SamlConfig`          | SAML 2.0 IdP/SP config; **`spPrivateKey` omitted**             |
| `uploadedFiles`       | `UploadedFile`        | Object-storage file metadata (key, size, mime, owner)          |
| `aiUsageLogs`         | `AiUsageLog`          | LLM usage records (provider, model, tokens, cost)              |
| `notificationLogs`    | `NotificationLog`     | Outbound email/SMS delivery records                            |
| `tenantUsage`         | `TenantUsage`         | Aggregated usage counters (requests, storage, seats)           |

## What it omits

- **Webhook signing secrets** (`secret` column) — HMAC-SHA256 secrets are stripped before serialisation.
- **API key hashes** (`keyHash` column) — SHA-256 digests are stripped; raw keys are never persisted.
- **SAML SP private keys** (`spPrivateKey` column) — service-provider signing keys are stripped.
- **User passwords** — passwords live on the `User` entity in the system database, not in the tenant DB.

## Response format

```json
{
  "exportedAt": "2026-05-23T12:00:00.000Z",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "members": [ ... ],
  "domains": [ ... ],
  "auditLogs": [ ... ],
  "webhooks": [ ... ],
  "webhookDeliveries": [ ... ],
  "settings": [ ... ],
  "payments": [ ... ],
  "paymentTransactions": [ ... ],
  "subscriptions": [ ... ],
  "subscriptionPlans": [ ... ],
  "planFeatures": [ ... ],
  "coupons": [ ... ],
  "couponRedemptions": [ ... ],
  "apiKeys": [ ... ],
  "samlConfigs": [ ... ],
  "uploadedFiles": [ ... ],
  "aiUsageLogs": [ ... ],
  "notificationLogs": [ ... ],
  "tenantUsage": [ ... ]
}
```

## HTTP endpoint

```
POST /tenant/:tenantId/api/export
```

- **Auth required:** Yes — tenant session cookie with `OWNER` role.
- **Rate limited:** Yes (shared `api` bucket via `Limiter`).
- **Response:** `200 application/json` with `Content-Disposition: attachment` so browsers prompt a file download.
- **Filename pattern:** `tenant-export-{tenantId}-{YYYY-MM-DD}.json`

## Usage (server-side)

```typescript
import TenantExportService from '@/modules/tenant_export/tenant_export.service';

const buffer = await TenantExportService.exportTenantData(tenantId);
// buffer is a UTF-8 JSON Buffer ready to stream or write to storage
```
