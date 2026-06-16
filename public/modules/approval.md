# Approval Queue

- **id:** `approval`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/approval/`
- **tags:** approval, moderation, queue, review, back-office
- **icon:** `fas fa-clipboard-check`
- **hasNextLayer:** true

Generic, entity-agnostic moderation / approval queue. Any owning module can route an entity through human review via the queue (keyed by entityType + entityId) with a tamper-evident per-tenant decision hash chain and an in-memory decision-handler hook. Open items are PENDING / IN_REVIEW / ESCALATED; terminal items are APPROVED / REJECTED, with a partial unique index enforcing at most one open item per entity and SLA-by-priority due dates. Every decision is recorded in the append-only audit log; submitters are notified in-app and webhooks fire on each lifecycle event.

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`, `webhook`, `audit_log`, `notification_inapp`

## Services

- `approval.decide.service.ts`
- `approval.read.service.ts`
- `approval.service.ts`
- `approval.submit.service.ts`

## DTOs

- `approval.dto.ts`

## Entities

- `approval_queue_item.entity.ts`

## Enums

- `approval.enums.ts`

## Message keys

- `approval.messages.ts`

## TypeORM entities

- `ApprovalQueueItem` (system) — `modules/approval/server/entities/approval_queue_item.entity.ts`

## Next layer (modules_next/) surface

- `approval/ui/approval-columns.component` _(ui, client)_
- `approval/ui/approvals.page` _(ui, client)_
