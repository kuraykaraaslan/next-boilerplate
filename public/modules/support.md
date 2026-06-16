# Support Desk

- **id:** `support`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/support/`
- **tags:** support, tickets, helpdesk, sla, back-office
- **icon:** `fas fa-life-ring`
- **hasNextLayer:** false

Customer support-ticket desk. Customers open support tickets with per-tenant monotonic ticket numbers (e.g. TICK-2026-00001), agent assignment, internal agent-only notes, threaded messages, and first-response + resolution SLA tracking. Ticket status flows OPEN → PENDING (agent replied) → RESOLVED → CLOSED; the first agent reply records the first-response time. Lifecycle changes are written to the append-only audit log; requesters/agents are notified in-app and webhooks fire on each event.

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`, `webhook`, `audit_log`, `notification_inapp`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/support/tickets`
- `tenant` GET/PATCH `/tenant/[tenantId]/api/support/tickets/[ticketId]`
- `tenant` POST `/tenant/[tenantId]/api/support/tickets/[ticketId]/messages`

## TypeORM entities

- `SupportTicket` (system) — `modules/support/server/entities/support_ticket.entity.ts`
- `SupportTicketMessage` (system) — `modules/support/server/entities/support_ticket_message.entity.ts`
