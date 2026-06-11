# Audit Log

- **id:** `audit_log`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/audit_log/`
- **tags:** platform, security, compliance
- **icon:** `fas fa-clipboard-list`
- **hasNextLayer:** true

Append-only audit trail for sensitive actions, stored per-tenant (platform events land on ROOT_TENANT_ID).

## Dependencies

- **requires:** `db`, `env`, `logger`

## Services

- `audit_log.service.ts`

## DTOs

- `audit_log.dto.ts`

## Entities

- `audit_log.entity.ts`

## Enums

- `audit_log.enums.ts`

## Message keys

- `audit_log.messages.ts`

## Owned API routes

- `tenant` GET `/tenant/[tenantId]/api/audit-logs`

## TypeORM entities

- `AuditLog` (tenant) — `modules/audit_log/entities/audit_log.entity.ts`

## Next layer (modules_next/) surface

- `audit_log/audit_log.service.next` _(service.next)_
- `audit_log/ui/AuditLogFilters` _(ui, client)_

## README

# Audit Log Module

Append-only event logging for sensitive system and tenant-level actions. Records the actor, action, resource, metadata, IP, and user agent, and supports paginated, filtered querying. Every row is persisted to the acting tenant's own DB; platform-level events fall back to `ROOT_TENANT_ID`.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `AuditLog` | `audit_logs` | One immutable audit event. Lives in the **tenant DB** (platform events land on the `ROOT_TENANT_ID` tenant). |

Columns: `auditLogId` (uuid PK), `tenantId`, `actorId` (nullable), `actorType` (default `SYSTEM`), `action`, `resourceType` (nullable), `resourceId` (nullable), `metadata` (`jsonb`), `ipAddress` (nullable), `userAgent` (nullable), `createdAt`. Indexes on `tenantId`, `actorId`, `action`, and `resourceType`.

---

## Service / Responsibilities

`AuditLogService` (`audit_log.service.ts`) is the only service — there is no repository abstraction beyond it.

| Method | Responsibility |
|---|---|
| `log(input)` | Validate the input (`CreateAuditLogDTO`), resolve `tenantId` (defaulting null/omitted to `ROOT_TENANT_ID`), open that tenant's DataSource via `tenantDataSourceFor`, and persist one row. **Never throws** — failures are caught and logged so auditing can't break the calling operation. Also emits a structured `[AUDIT]` line via `Logger`. |
| `getAll(input)` | Validate the query (`GetAuditLogsDTO`), resolve the tenant the same way, and return `{ logs, total }` filtered by `tenantId` plus optional `actorId`, `action` (partial `ILike` match), `resourceType`, `resourceId`, ordered by `createdAt DESC` and paginated. Rows are parsed through `AuditLogSchema` before return. |

There is no retention/pruning logic — the trail is keep-forever.

---

## Types & Enums

| File | Exports |
|---|---|
| `audit_log.types.ts` | `AuditLogSchema` / `AuditLog` — the parsed read shape. |
| `audit_log.dto.ts` | `CreateAuditLogDTO` / `CreateAuditLogInput` and `GetAuditLogsDTO` / `GetAuditLogsInput` (Zod). `pageSize` is capped at `100` (default `20`); `page` defaults to `1`. |
| `audit_log.enums.ts` | `AuditActorTypeEnum` (`USER` \| `SYSTEM`) and the `AuditActions` constant map (dotted action strings like `auth.login`, `tenant.created`, `subscription.assigned`, …) plus the `AuditAction` union. |
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
| GET | `/tenant/[tenantId]/api/audit-logs` | tenant `ADMIN` | List audit logs scoped to this tenant. Query params: `page`, `pageSize`, `actorId`, `action`, `resourceType`, `resourceId`. |

The handler authenticates via `TenantSessionNextService.authenticateTenantByRequest({ requiredTenantRole: "ADMIN" })` behind the rate limiter. On the root tenant the same endpoint surfaces platform-wide audit logs (the rows written with `ROOT_TENANT_ID`).

---

## Settings

This module exposes **no** settings — neither per-tenant nor system-only. Logging is unconditional and uniform across tenants.

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
