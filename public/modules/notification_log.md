# Notification Log

- **id:** `notification_log`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/notification_log/`
- **tags:** notifications, audit
- **icon:** `fas fa-clipboard-list`
- **hasNextLayer:** false

Unified outbound notification audit log across mail, sms, push, inapp channels.

## Dependencies

- **requires:** `db`, `tenant`

## Services

- `notification_log.service.ts`

## Entities

- `notification_log.entity.ts`

## TypeORM entities

- `NotificationLog` (system) — `modules/notification_log/entities/notification_log.entity.ts`

## README

# Notification Log Module

Unified outbound notification audit log. One row per delivery attempt across all channels (`mail`, `sms`, `push`, `inapp`). The channel-specific notification services (`notification_mail`, `notification_sms`, ...) call into this module from their BullMQ worker completion/failure handlers.

---

## What it does

- Persists `NotificationLog` rows to the tenant DB with channel, recipient, provider, status, optional `subject`, `providerMessageId`, and `error`.
- Powers admin "outbound deliveries" dashboards and per-user delivery history.
- Pairs with `tenant_usage` counters (`emailSends`, `smsSends`) — counters answer "how many", logs answer "to whom, by which provider, succeeded?".

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `NotificationLog` | `notification_logs` | One write-once audit row per outbound delivery attempt |

Lives in the **tenant DB**. Indexed on `tenantId`, `channel`, `recipient`, and `status`; `recipient` holds an email / phone / userId depending on channel. `sentAt` is a `@CreateDateColumn`. Registered via `modules/db/db.ts`.

Channel values: `mail | sms | push | inapp`. Status values: `sent | failed | pending`.

---

## Service

`NotificationLogService` (default export) is tenant-scoped — every method resolves the per-tenant DataSource via `tenantDataSourceFor(tenantId)`.

| Method | Responsibility |
|---|---|
| `log(tenantId, channel, recipient, status, opts?)` | Insert one audit row. Returns `null` (no-op) when `tenantId` or `recipient` is missing. Best-effort: any persistence error is swallowed and logged via `Logger.warn`, so the outbound notification flow is never blocked by audit-log unavailability. `provider` defaults to `'unknown'`. |
| `list(tenantId, query?)` | Paginated, filterable history (`channel`, `status`, `recipient`), ordered `sentAt DESC`. `limit` defaults to 50 and is capped at 200; `offset` defaults to 0. Returns `{ logs, total }`. |
| `getById(tenantId, id)` | Fetch a single row by `notificationLogId`, scoped to `tenantId`. |

---

## API

```ts
import NotificationLogService from '@/modules/notification_log/notification_log.service';

await NotificationLogService.log(tenantId, 'mail', 'user@example.com', 'sent', {
  subject: 'Welcome',
  provider: 'smtp',
  providerMessageId: '<abc@host>',
});

await NotificationLogService.log(tenantId, 'sms', '+12025551234', 'failed', {
  provider: 'twilio',
  error: 'Twilio: invalid recipient',
});

const { logs, total } = await NotificationLogService.list(tenantId, {
  channel: 'mail',
  status: 'failed',
  limit: 50,
});
```

`log()` swallows errors — outbound notification flow is never blocked by audit-log unavailability.

---

## Settings

This module has **no settings** — no per-tenant settings and no system-only settings. Behavior is fixed in code.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Unified outbound notification audit log (mail, sms, push, inapp) with tenant-scoped write-once records; no per-tenant settings or behavior branches.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `NotificationLog` | `notification_logs` | channel, recipient, subject, provider, status, providerMessageId, error |

All rows isolated by `tenantId` via the per-tenant DataSource.

---

## Dependencies

`db`, `tenant`. Consumed by `notification_mail` and `notification_sms` (which call `NotificationLogService.log` from their worker completion/failure handlers).
