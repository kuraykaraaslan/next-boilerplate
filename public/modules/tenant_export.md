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

- `tenant_export.job.service.ts`
- `tenant_export.service.ts`

## Entities

- `tenant_export_job.entity.ts`

## Owned API routes

- `tenant` POST `/tenant/[tenantId]/api/export`

## TypeORM entities

- `TenantExportJob` (tenant) — `modules/tenant_export/entities/tenant_export_job.entity.ts`

## README

# Tenant Export Module

GDPR Article 20 (data portability) — lets a tenant `OWNER` download all of their tenant's data as a single structured JSON file, read from the tenant's own datasource.

---

## Entities

This module owns **no entities** and no settings. It is a single static service that reads from entities owned by other modules, all from the **tenant DB** via `tenantDataSourceFor(tenantId)`.

---

## Services / Responsibilities

`TenantExportService.exportTenantData(tenantId)` opens the tenant's datasource, reads every per-tenant collection in parallel, strips sensitive columns, and returns a UTF-8 JSON `Buffer` (pretty-printed, 2-space indent). Each collection is filtered by `where: { tenantId }` (`PaymentTransaction` is joined through `Payment.tenantId` since it has no direct `tenantId`).

| Field | Source entity | Notes |
|---|---|---|
| `members` | `TenantMember` | All member rows (role, status, timestamps) |
| `domains` | `TenantDomain` | All custom domains and their verification status |
| `auditLogs` | `AuditLog` | Most recent 1000 entries, ordered newest-first (`take: 1000`) |
| `webhooks` | `Webhook` | Endpoint config; **`secret` (HMAC signing secret) omitted** |
| `webhookDeliveries` | `WebhookDelivery` | Per-attempt delivery log (status, response code, retry count) |
| `settings` | `Setting` | All key/value settings rows; `null` if none exist |
| `payments` | `Payment` | Payment intents / charges scoped to this tenant |
| `paymentTransactions` | `PaymentTransaction` | Provider-side transaction ledger (joined via `Payment.tenantId`) |
| `subscriptions` | `TenantSubscription` | Active and historical plan subscriptions |
| `subscriptionPlans` | `SubscriptionPlan` | Tenant-owned plans (price, interval, currency) |
| `planFeatures` | `PlanFeature` | Feature flags attached to each plan |
| `coupons` | `Coupon` | Tenant-owned promo codes |
| `couponRedemptions` | `CouponRedemption` | Who redeemed which coupon, when |
| `apiKeys` | `ApiKey` | API key metadata; **`keyHash` omitted** |
| `samlConfigs` | `SamlConfig` | SAML 2.0 IdP/SP config; **`spPrivateKey` omitted** |
| `uploadedFiles` | `UploadedFile` | Object-storage file metadata (key, size, mime, owner) |
| `aiUsageLogs` | `AiUsageLog` | LLM usage records (provider, model, tokens, cost) |
| `notificationLogs` | `NotificationLog` | Outbound email/SMS delivery records |
| `tenantUsage` | `TenantUsage` | Aggregated usage counters (requests, storage, seats) |

The result is wrapped with an `exportedAt` ISO timestamp and the `tenantId`. The service logs the start of an export and a per-collection row-count summary on completion.

---

## API Routes

| Method | Path | Scope | Description |
|---|---|---|---|
| POST | `/tenant/[tenantId]/api/export` | tenant `OWNER` | Stream a full JSON data export as a file download |

- **Auth:** `TenantSessionNextService.authenticateTenantByRequest` with `requiredTenantRole: 'OWNER'`.
- **Rate limited:** Yes — shared `api` bucket via `Limiter.checkRateLimit`.
- **Response:** `200 application/json` with `Content-Disposition: attachment` (browsers prompt a file download), `Content-Length`, and an `X-Export-TenantId` header.
- **Filename pattern:** `tenant-export-{tenantId}-{YYYY-MM-DD}.json`.

---

## Settings

None. This module has no per-tenant or system settings (see *Tenant Variability* for fields that are hardcoded today and could become configurable).

---

## Security

Sensitive columns are stripped before serialisation (`stripFields`):

- **Webhook signing secrets** (`secret`) — HMAC-SHA256 secrets are removed from `webhooks`.
- **API key hashes** (`keyHash`) — SHA-256 digests are removed from `apiKeys`; raw keys are never persisted.
- **SAML SP private keys** (`spPrivateKey`) — service-provider signing keys are removed from `samlConfigs`.
- **User passwords** — never present here; passwords live on the `User` entity in the **system** database, not in the tenant DB.

Access is gated to the tenant `OWNER` role and rate-limited at the route layer. Errors are logged and returned as `500 { message }`.

---

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

---

## Usage (server-side)

```typescript
import TenantExportService from '@/modules/tenant_export/tenant_export.service';

const buffer = await TenantExportService.exportTenantData(tenantId);
// buffer is a UTF-8 JSON Buffer ready to stream or write to storage
```

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A single static service that produces a GDPR-style JSON dump of all per-tenant data from the tenant's own datasource; it is fully tenant-scoped structurally (via tenantDataSourceFor + where:{tenantId}) but has no configurable per-tenant settings, owns no entities, and applies identical export logic to every tenant.

### Per-tenant behavior

- `tenant_export.service.ts:exportTenantData` — The export contents differ per tenant: every collection (members, domains, auditLogs, webhooks, settings, payments, subscriptions, plans, coupons, apiKeys, samlConfigs, uploadedFiles, aiUsageLogs, notificationLogs, tenantUsage) is read from the request tenant's own database via tenantDataSourceFor(tenantId) and filtered by where:{tenantId} (PaymentTransaction is joined through Payment.tenantId). This is structural tenant isolation only — the export logic, field-stripping, and limits are identical for all tenants; nothing branches on per-tenant settings.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Audit-log export cap is hardcoded to the most recent 1000 entries for every tenant (take: 1000). | `tenant_export.service.ts:exportTenantData (AuditLog .find { order: createdAt DESC, take: 1000 })` | A full GDPR Art. 20 data-portability export arguably should not silently truncate a tenant's audit history; tenants with retention/compliance needs may want a higher (or unlimited) cap, while the global default protects shared infra from huge exports. Making it a per-tenant override would let admins configure their own export depth. | `tenantExportAuditLogLimit` |

---

## Dependencies

Requires `db`, `tenant`, and `storage` (per `module.json`). Reads entities owned by `tenant_member`, `tenant_domain`, `audit_log`, `webhook`, `setting`, `payment`, `tenant_subscription`, `coupon`, `api_key`, `auth_saml`, `storage`, `ai`, `notification_log`, and `tenant_usage`.
