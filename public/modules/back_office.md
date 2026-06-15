# Back-Office

- **id:** `back_office`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/back_office/`
- **tags:** back-office, moderation, approval, support, tickets, queue
- **icon:** `fas fa-clipboard-check`
- **hasNextLayer:** false

Generic moderation / approval queue and support-ticket desk. Any owning module can route an entity through human review via the entity-agnostic approval queue (with a tamper-evident per-tenant decision hash chain and an in-memory decision-handler hook), and customers can open support tickets with per-tenant monotonic ticket numbers, agent assignment, internal notes, first-response + resolution SLA tracking. Every decision is recorded in the append-only audit log; submitters/requesters are notified in-app and webhooks fire on each lifecycle event.

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`, `redis`, `webhook`, `audit_log`, `notification_inapp`, `tenant_member`

## Services

- `back_office.approval.service.ts`
- `back_office.service.ts`
- `back_office.support.service.ts`

## DTOs

- `back_office.dto.ts`

## Entities

- `approval_queue_item.entity.ts`
- `support_ticket.entity.ts`
- `support_ticket_message.entity.ts`

## Enums

- `back_office.enums.ts`

## Message keys

- `back_office.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/back-office/approvals`
- `tenant` GET/PATCH `/tenant/[tenantId]/api/back-office/approvals/[approvalItemId]`
- `tenant` GET/POST `/tenant/[tenantId]/api/back-office/support/tickets`
- `tenant` GET/PATCH `/tenant/[tenantId]/api/back-office/support/tickets/[ticketId]`
- `tenant` POST `/tenant/[tenantId]/api/back-office/support/tickets/[ticketId]/messages`

## TypeORM entities

- `ApprovalQueueItem` (system) — `modules/back_office/entities/approval_queue_item.entity.ts`
- `SupportTicket` (system) — `modules/back_office/entities/support_ticket.entity.ts`
- `SupportTicketMessage` (system) — `modules/back_office/entities/support_ticket_message.entity.ts`
