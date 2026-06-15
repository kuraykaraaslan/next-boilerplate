# Tenant Usage

- **id:** `tenant_usage`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant_usage/`
- **tags:** tenant, metrics, billing
- **icon:** `fas fa-chart-line`
- **hasNextLayer:** false

Usage metric tracking per tenant (API calls, storage GB, seats). Source for plan-limit enforcement.

## Dependencies

- **requires:** `db`, `tenant`

## Services

- `tenant_usage.alerts.service.ts`
- `tenant_usage.service.ts`

## Entities

- `tenant_usage.entity.ts`

## Message keys

- `tenant_usage.messages.ts`

## Jobs

- `tenant_usage.job.ts`

## TypeORM entities

- `TenantUsage` (tenant) — `modules/tenant_usage/entities/tenant_usage.entity.ts`

## README

# Tenant Usage Module

Tracks per-tenant usage counters (API calls, AI tokens, storage bytes, email sends) by month. Counters are stored in Redis for low-latency O(1) increments and flushed to the `tenant_usage` PostgreSQL table by a background CRON job for durable reporting and plan-limit enforcement.

## What it does

- Provides `TenantUsageService` with static methods to increment counters and read/flush usage.
- The `TenantUsage` TypeORM entity persists monthly aggregates with a `UNIQUE(tenantId, month)` constraint.
- Redis keys expire automatically after 32 days so stale data is cleaned up.

## Redis key pattern

```
tenant:{tenantId}:usage:{metric}:{YYYY-MM}
```

Example: `tenant:abc-123:usage:apiCalls:2026-05`

Metrics: `apiCalls`, `aiTokens`, `storageBytes`, `emailSends`, `smsSends`

## Incrementing counters

```typescript
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service';

// In an API route or middleware:
await TenantUsageService.incrementApiCall(tenantId);

// After an AI completion:
await TenantUsageService.incrementAiTokens(tenantId, tokensUsed);

// After a file upload:
await TenantUsageService.incrementStorageBytes(tenantId, fileSizeBytes);

// After a successful email/sms delivery:
await TenantUsageService.incrementEmailSends(tenantId, 1);
await TenantUsageService.incrementSmsSends(tenantId, 1);
```

### Wired call sites (live in this codebase)

| Caller | Counter | Trigger |
|---|---|---|
| `modules/ai/ai.service.ts` (`chat` / `chatStream` / `embed`) | `aiTokens` | provider returns `usage.totalTokens` |
| `modules/storage/storage.service.ts` (`uploadFile`, `uploadFromUrl`) | `storageBytes` | after `UploadedFile` audit insert |
| `modules/notification_mail/notification_mail.service.ts` (`_sendMail` worker) | `emailSends` | provider returns `success: true` |
| `modules/notification_sms/notification_sms.service.ts` (`_sendShortMessage` worker) | `smsSends` | provider returns `success: true` |

`apiCalls` increment is wired at the route-middleware layer (Limiter hook); endpoints do not call it directly.

## Reading usage

```typescript
const usage = await TenantUsageService.getUsage(tenantId);
// { apiCalls: 42, aiTokens: 8000, storageBytes: 1048576, emailSends: 0, smsSends: 0 }

// For a specific past month:
const lastMonth = await TenantUsageService.getUsage(tenantId, '2026-04');
```

`getUsage` reads from Redis first and falls back to the DB when Redis has no data (e.g. after a restart or for historical months).

## Flushing to the database

Call `flushToDb` from a CRON job (e.g. hourly) to persist counters durably:

```typescript
// In a CRON handler:
const month = TenantUsageService.currentMonth();
await TenantUsageService.flushToDb(tenantId, month);
```

`flushToDb` reads all 4 Redis counters and upserts the `TenantUsage` row for the given tenant+month. If all counters are zero, it skips the DB write.

## Background job

`tenant_usage.job.ts` runs an hourly BullMQ flush (queue `tenant-usage-flush`, concurrency 1): it loads every `ACTIVE` tenant and calls `flushToDb` for the current month, so the 32-day-TTL Redis counters are persisted before they can expire at month end. Triggered by `scheduleUsageFlushJob()` at boot (self-hosted) or `POST /api/cron/usage-flush` with the `CRON_SECRET` bearer token (serverless).

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Per-tenant monthly usage metering (API calls, AI tokens, storage bytes, email/SMS sends) — Redis counters flushed to a tenant-scoped table by an hourly job.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `TenantUsage` | `tenant_usage` | month, apiCalls, aiTokens, storageBytes, emailSends, smsSends |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `tenant_usage.service.ts` — per-tenant Redis counters keyed `tenant:<tenantId>:usage:<metric>:<month>` (the `increment*` methods); best-effort, never blocks the originating action.
- `tenant_usage.service.ts:getUsage / flushToDb` — read/persist each tenant's monthly usage via `tenantDataSourceFor(tenantId)` (Redis-first, DB fallback).
- `tenant_usage.job.ts` — the hourly flush iterates every `ACTIVE` tenant and writes that tenant's counters into its own `TenantUsage` row.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Counter retention TTL (32 days) | `tenant_usage.service.ts:TTL_SECONDS` | Fixed to the billing month for all tenants | intentionally global — N/A |
| Flush cadence & worker concurrency | `tenant_usage.job.ts` | Single shared cron + worker, not per-tenant | intentionally global — N/A |

---

## Entity registration

`TenantUsage` is registered in `modules/db/db.ts` (single DataSource).
