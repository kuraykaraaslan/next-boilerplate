# Audit Log

- **id:** `audit_log`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/audit_log/`
- **tags:** platform, security, compliance
- **icon:** `fas fa-clipboard-list`
- **hasNextLayer:** false

Append-only audit trail for sensitive actions, stored per-tenant (platform events land on ROOT_TENANT_ID).

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`, `redis`, `setting`, `webhook`, `tenant`

## Owned API routes

- `tenant` GET `/tenant/[tenantId]/api/audit-logs`
- `tenant` POST `/tenant/[tenantId]/api/audit-logs/anonymize`
- `tenant` GET `/tenant/[tenantId]/api/audit-logs/cross-tenant`
- `tenant` GET `/tenant/[tenantId]/api/audit-logs/export`
- `tenant` POST `/tenant/[tenantId]/api/audit-logs/purge`
- `tenant` GET `/tenant/[tenantId]/api/audit-logs/verify`

## TypeORM entities

- `AuditLog` (tenant) — `modules/audit_log/server/entities/audit_log.entity.ts`

## README

# Audit Log Module

Append-only event logging for sensitive system and tenant-level actions. Records the actor, action, resource, metadata, IP, and user agent, and supports paginated, filtered querying. Every row is persisted to the acting tenant's own DB; platform-level events fall back to `ROOT_TENANT_ID`.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `AuditLog` | `audit_logs` | One immutable audit event. Lives in the **tenant DB** (platform events land on the `ROOT_TENANT_ID` tenant). |

Columns: `auditLogId` (uuid PK), `tenantId`, `actorId` (nullable), `actorType` (default `SYSTEM`), `onBehalfOfActorId` (nullable — dual-actor / impersonation), `action`, `severity` (`low|medium|high|critical`, default `low`), `resourceType` (nullable), `resourceId` (nullable), `metadata` (`jsonb`), `ipAddress` (nullable), `userAgent` (nullable), `prevHash`/`rowHash` (nullable — hash chain), `createdAt`, `deletedAt` (nullable — soft-delete guard). Indexes on `tenantId`, `actorId`, `onBehalfOfActorId`, `action`, `severity`, `resourceType`, plus a compound `(tenantId, createdAt DESC)` index (`IDX_audit_logs_tenant_created`) backing the hot read path.

New columns/indexes are provisioned by `modules/db/migrations/005_audit_log_compliance.sql` for production; `synchronize: true` produces them in dev.

---

## Service / Responsibilities

`AuditLogService` (`audit_log.service.ts`) is the only service — there is no repository abstraction beyond it.

| Method | Responsibility |
|---|---|
| `log(input)` | Validate the input (`CreateAuditLogDTO`), resolve `tenantId` (defaulting null/omitted to `ROOT_TENANT_ID`), open that tenant's DataSource via `tenantDataSourceFor`, and persist one row. **Never throws** — failures are caught and logged so auditing can't break the calling operation. Also emits a structured `[AUDIT]` line via `Logger`. |
| `getAll(input)` | Validate the query (`GetAuditLogsDTO`), resolve the tenant the same way, and return `{ logs, total }` filtered by `tenantId` plus optional `actorId`, `action` (partial `ILike` match), `severity`, `resourceType`, `resourceId`, and an inclusive `fromDate`/`toDate` range on `createdAt`, ordered by `createdAt DESC` and paginated. Excludes soft-deleted rows. Rows are parsed through `AuditLogSchema` before return. |
| `purgeExpired(input, exporter?)` | Per-tenant retention purge. Reads `auditLogRetentionDays`; 0/unset = keep forever (no-op). Otherwise hard-deletes rows older than the cutoff. With `archive: true`, serializes the doomed batch to NDJSON first — handed to the optional `AuditArchiveExporter` if supplied, else returned to the caller. Returns `{ purged, cutoff, archive }`. |
| `anonymizeActor(input)` | Right-to-erasure (GDPR Art. 17). Nulls `actorId`/`onBehalfOfActorId`, stores a stable `anon:<sha256>` pseudonym in metadata for correlation, scrubs PII metadata + IP/UA — while preserving the row and `action`. Returns `{ anonymized }`. |
| `exportLogs(input)` | Right-to-access (GDPR Art. 15) + bulk export. Returns all non-deleted rows for the tenant (optionally filtered by `actorId` for a per-user SAR, plus a date range) serialized as `csv` or `ndjson`. Returns `{ format, body, count }`. |
| `verifyChain(tenantId)` | Recomputes the per-tenant append-only hash chain and confirms each row's `prevHash`/`rowHash` links match. Returns `{ ok, checked, brokenAt }` (`brokenAt` = first tampered row's id). |
| `queryCrossTenant(callerTenantId, input)` | **Root tenant only** (rejects non-root callers with 403). Aggregates matching events across every tenant's audit table within a time window. Returns `{ logs, total }`. |
| `computeRowHash` / `scrubMetadata` / `serializeForArchive` / `serializeForCsv` | Pure helpers (also used by tests). `computeRowHash` is deterministic: `sha256(prevHash + canonical(row))` with recursively key-sorted metadata. |

### Retention, lifecycle & tamper design

- **Per-tenant retention** is driven by the `auditLogRetentionDays` setting (0 = keep forever). `purgeExpired` enforces it.
- **Automated purge** runs via the BullMQ job in `audit_log.purge.job.ts` (`scheduleAuditPurgeJob` for self-hosted, `runAuditPurgeSweep` for a serverless cron). The sweep iterates all tenants; keep-forever tenants are no-ops.
- **Archive-before-delete** is a pragmatic seam: `purgeExpired(..., exporter)` accepts an optional `AuditArchiveExporter` (`export(tenantId, ndjson, rowCount)`), so cold storage (S3/GCS/log aggregator) can be plugged in without the module hard-depending on any infra. Without an exporter, the NDJSON batch is returned to the caller.
- **Append-only hash chain** is the in-DB tamper-evidence. Every `log()` links `prevHash` to the previous row's `rowHash` and computes `rowHash = sha256(prevHash + canonical(row))` per tenant. `verifyChain` detects any modification or deletion within the kept window.
- **Separate write-once store** is documented as a design seam (see below) rather than implemented infra — the hash chain provides in-DB tamper-evidence today; the `AuditArchiveExporter` interface is the extension point for an external immutable store.
- **Soft-delete guard**: the entity uses a `DeleteDateColumn` (`deletedAt`) so accidental TypeORM deletes are soft and excluded from normal reads; only the retention purge performs hard deletes (after optional archive).

#### Separate write-once store (design seam, not implemented)

The audit trail lives in the same per-tenant Postgres DB as application data, so a compromised app credential could in principle delete rows. Two layers mitigate this:
1. **In-DB tamper-evidence (implemented):** the per-tenant hash chain makes any row modification or deletion detectable via `verifyChain`.
2. **External write-once store (seam):** the `AuditArchiveExporter` interface is the integration point for shipping rows to an immutable destination (write-only DB user, immutable S3 bucket, or a log aggregator). Implement it and pass it to `purgeExpired` (or a custom sweep) to satisfy ISO 27001 A.12.4 / PCI-DSS Req. 10. No external infra is bundled.

### Severity, alerting & dual-actor

- **Severity/risk score**: `severityForAction(action)` resolves a severity from the `ACTION_SEVERITY` map in `audit_log.enums.ts` (unknown actions default to `low`). Severity is stored on the row and filterable in `getAll`.
- **Real-time high-risk webhook**: when a logged event is `high`/`critical`, `log()` fires a best-effort `audit.high_risk` webhook via `WebhookService.dispatchEvent`. A webhook failure never breaks the audit write.
- **Dual-actor (impersonation)**: `onBehalfOfActorId` is an optional, additive column — `actorId` stays the TRUE actor (e.g. the platform admin) and `onBehalfOfActorId` carries the impersonated user. Callers that don't set it are unaffected.

### Async / queue-based writing

`log()` remains a resilient synchronous write (try/catch wrapped, never throws). For high-write tenants, the queue option is the same pattern as `audit_log.purge.job.ts` (BullMQ): enqueue the `CreateAuditLogInput` and process it in a worker that calls `log()`. This is left as a documented seam rather than a default to avoid hashing-order complications (the hash chain requires serialized, ordered writes per tenant).

---

## Types & Enums

| File | Exports |
|---|---|
| `audit_log.types.ts` | `AuditLogSchema` / `AuditLog` — the parsed read shape. |
| `audit_log.dto.ts` | `CreateAuditLogDTO` (now incl. optional `onBehalfOfActorId`, `severity`), `GetAuditLogsDTO` (incl. `severity`, `fromDate`, `toDate`), plus `PurgeAuditLogsDTO`, `ExportAuditLogsDTO`, `AnonymizeActorDTO`, `CrossTenantAuditQueryDTO`. `pageSize` capped at `100` (default `20`). Input types use `z.input` so raw ISO date strings are accepted. |
| `audit_log.enums.ts` | `AuditActorTypeEnum` (`USER` \| `SYSTEM` \| `API_KEY`), `AuditSeverityEnum` (`low`\|`medium`\|`high`\|`critical`), `HIGH_RISK_SEVERITIES`, the `AuditActions` constant map + `AuditAction` union, the `ACTION_SEVERITY` map, and `severityForAction(action)`. |
| `audit_log.setting.keys.ts` | `AuditLogSettingKeySchema` (Zod enum) + `AUDIT_LOG_SETTING_KEYS` (currently `auditLogRetentionDays`) and `RETENTION_KEEP_FOREVER`. |
| `audit_log.settings.fields.ts` | `AUDIT_LOG_SETTINGS_FIELDS` — admin-UI metadata consumed by `ModuleSettingsPage`. |
| `audit_log.purge.job.ts` | BullMQ retention-purge sweep: `auditPurgeQueue`, `auditPurgeWorker`, `scheduleAuditPurgeJob`, `runAuditPurgeSweep`. |
| `audit_log.messages.ts` | `AuditLogMessages` error/status strings. |
| `audit_log.seed.ts` | `seedAuditLog(ctx)` — idempotent demo seed (login, failed login, settings change, subscription assignment, invitation, file upload) keyed on `tenantId + action + resourceId`. |

`AuditActions` is a non-exhaustive catalog — domains may pass any non-empty `action` string; the constants exist for consistency.

---

## Writing a Log

```typescript
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AuditActions } from '@/modules/audit_log/audit_log.enums';

await AuditLogService.log({
  actorId: userId,
  actorType: 'USER',
  action: AuditActions.INVITATION_SENT,
  resourceType: 'tenant_invitation',
  resourceId: invitation.id,
  tenantId,                              // omit for platform events → ROOT_TENANT_ID
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  metadata: { invitedEmail: dto.email },
});
```

---

## Querying Logs

```typescript
const { logs, total } = await AuditLogService.getAll({
  tenantId,
  page: 1,
  pageSize: 20,
  actorId: userId,                       // optional
  action: 'invitation',                  // optional — partial (ILike) match
  resourceType: 'tenant_invitation',     // optional
  resourceId: invitation.id,             // optional
});
```

---

## API Routes

| Method | Path | Scope | Description |
|---|---|---|---|
| GET  | `/tenant/[tenantId]/api/audit-logs` | tenant `ADMIN` | List logs. Query params: `page`, `pageSize`, `actorId`, `action`, `severity`, `resourceType`, `resourceId`, `fromDate`, `toDate`. |
| POST | `/tenant/[tenantId]/api/audit-logs/purge` | tenant `ADMIN` | Run the retention purge. Body `{ archive?: boolean }`. |
| GET  | `/tenant/[tenantId]/api/audit-logs/export` | tenant `ADMIN` | Bulk export. Query: `format=csv|ndjson`, `actorId` (per-user SAR), `fromDate`, `toDate`. Streams a file download. |
| POST | `/tenant/[tenantId]/api/audit-logs/anonymize` | tenant `ADMIN` | Right-to-erasure. Body `{ actorId }`. |
| GET  | `/tenant/[tenantId]/api/audit-logs/verify` | tenant `ADMIN` | Verify the hash chain → `{ ok, checked, brokenAt }`. |
| GET  | `/tenant/[tenantId]/api/audit-logs/cross-tenant` | **root** `ADMIN` | Cross-tenant aggregated view (rejects non-root). Query: `action`, `severity`, `fromDate`, `toDate`, `limit`. |

All handlers authenticate via `TenantSessionNextService.authenticateTenantByRequest({ requiredTenantRole: "ADMIN" })` behind the rate limiter and propagate `AppError.statusCode`. On the root tenant the list endpoint surfaces platform-wide audit logs (rows written with `ROOT_TENANT_ID`); the cross-tenant endpoint is gated to the root tenant in the service via `isRootTenant`.

---

## Settings

Per-tenant settings (Zod-enumerated in `audit_log.setting.keys.ts`, edited via the admin page at `app/tenant/[tenantId]/admin/(tenant-scope)/audit-logs/settings/page.tsx` using `ModuleSettingsPage`):

| Key | Type | Default | Meaning |
|---|---|---|---|
| `auditLogRetentionDays` | number | `0` | Days to keep audit rows before the retention purge deletes them. `0` = keep forever (the historical behaviour). |

Logging itself remains unconditional and uniform; only retention is configurable.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

An append-only audit trail that persists sensitive-action events per tenant (writing to and reading from each tenant's own DB via tenantDataSourceFor, with platform-level events falling back to ROOT_TENANT_ID), but it exposes no per-tenant settings or per-tenant behavioral branching today.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `AuditLog` | `audit_logs` | actorId, actorType, action, resourceType, resourceId, metadata, ipAddress, userAgent |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `audit_log.service.ts:log/getAll` — Both methods resolve the row's tenantId (defaulting null/omitted to ROOT_TENANT_ID for platform events) and open that tenant's data source via tenantDataSourceFor(tenantId), so each real tenant writes to and reads back its own isolated audit table; getAll filters strictly by that tenantId so a tenant only ever sees its own logs. This is routing/isolation rather than configurable per-tenant logic.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Audit-log retention is unbounded and uniform: log() always inserts and getAll() never prunes or applies any age cutoff, so every tenant keeps all audit rows forever with no per-tenant policy. | `audit_log.service.ts (AuditLogService.log / AuditLogService.getAll)` | Compliance and storage needs differ per tenant (e.g. a regulated tenant may require 7-year retention while another wants 30-day purge); a per-tenant retention window would let each tenant control how long their audit trail is kept. Currently hardcoded to keep-forever for everyone. | `auditLogRetentionDays` |
| Maximum query page size is hardcoded to 100 in GetAuditLogsDTO (pageSize max), applied identically to all tenants. | `audit_log.dto.ts (GetAuditLogsDTO.pageSize)` | Export/reporting-heavy tenants may want a larger page cap while others stay small; this is a global hardcoded limit that could plausibly be a per-tenant override, though it may be intentionally global as a safety bound. | `auditLogMaxPageSize` |

---

## Dependencies

Requires `db` (per-tenant DataSources via `tenantDataSourceFor`), `env`, and `logger`. Also depends on `@/modules/tenant` for `ROOT_TENANT_ID`.
