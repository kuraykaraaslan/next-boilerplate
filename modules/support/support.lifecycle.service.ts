import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import WebhookService from '@/modules/webhook/webhook.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import NotificationInAppService from '@/modules/notification_inapp/notification_inapp.service';
import { SupportTicket as SupportTicketEntity } from './entities/support_ticket.entity';
import { SupportTicketSchema, type SupportTicket } from './support.types';
import { SUPPORT_MESSAGES as MSG } from './support.messages';
import type { TicketStatus } from './support.enums';

/** Load + pessimistically lock a ticket, apply a mutator, save, and return it. */
async function mutate(
  tenantId: string,
  ticketId: string,
  mutator: (t: SupportTicketEntity) => void,
): Promise<SupportTicket> {
  const ds = await tenantDataSourceFor(tenantId);
  const row = await ds.transaction(async (manager) => {
    const repo = manager.getRepository(SupportTicketEntity);
    const ticket = await repo.findOne({
      where: { tenantId, ticketId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ticket) throw new AppError(MSG.TICKET_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    mutator(ticket);
    return repo.save(ticket);
  });
  return SupportTicketSchema.parse(row);
}

/** Audit + notify + webhook shared by resolve / close / status→resolved. */
function afterResolve(
  tenantId: string,
  ticket: SupportTicket,
  actorUserId?: string | null,
): void {
  void AuditLogService.log({
    tenantId,
    actorId: actorUserId ?? null,
    actorType: actorUserId ? 'USER' : 'SYSTEM',
    action: `support.ticket.${ticket.status.toLowerCase()}`,
    resourceType: 'support_ticket',
    resourceId: ticket.ticketId,
    metadata: { ticketNumber: ticket.ticketNumber, status: ticket.status },
  });
  if (ticket.requesterUserId) {
    void NotificationInAppService.push(tenantId, ticket.requesterUserId, {
      title: `Ticket ${ticket.ticketNumber} ${ticket.status.toLowerCase()}`,
      message: ticket.subject,
      type: 'support',
    }).catch((err) => Logger.error(`[support] notify requester failed: ${err}`));
  }
  void WebhookService.dispatchEvent(tenantId, 'support.ticket.resolved', {
    ticketId: ticket.ticketId,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
  }).catch((err) => Logger.error(`[support] webhook dispatch failed: ${err}`));
}

/** Assign (or unassign with null) a ticket to an agent. */
export async function assign(
  tenantId: string,
  ticketId: string,
  assignedToUserId: string | null,
  actorUserId?: string | null,
): Promise<SupportTicket> {
  const ticket = await mutate(tenantId, ticketId, (t) => {
    t.assignedToUserId = assignedToUserId;
  });
  void AuditLogService.log({
    tenantId,
    actorId: actorUserId ?? null,
    actorType: actorUserId ? 'USER' : 'SYSTEM',
    action: 'support.ticket.assigned',
    resourceType: 'support_ticket',
    resourceId: ticketId,
    metadata: { assignedToUserId },
  });
  if (assignedToUserId) {
    void NotificationInAppService.push(tenantId, assignedToUserId, {
      title: `Ticket ${ticket.ticketNumber} assigned to you`,
      message: ticket.subject,
      type: 'support',
    }).catch((err) => Logger.error(`[support] notify agent failed: ${err}`));
  }
  return ticket;
}

/** Set an explicit status (OPEN | PENDING | RESOLVED | CLOSED). */
export async function setStatus(
  tenantId: string,
  ticketId: string,
  status: TicketStatus,
  actorUserId?: string | null,
): Promise<SupportTicket> {
  const ticket = await mutate(tenantId, ticketId, (t) => {
    t.status = status;
    if (status === 'RESOLVED' && !t.resolvedAt) t.resolvedAt = new Date();
    if (status === 'OPEN' || status === 'PENDING') t.resolvedAt = null;
  });
  if (status === 'RESOLVED' || status === 'CLOSED') {
    afterResolve(tenantId, ticket, actorUserId);
  }
  return ticket;
}

/** Mark a ticket RESOLVED, stamping `resolvedAt`. */
export async function resolve(
  tenantId: string,
  ticketId: string,
  actorUserId?: string | null,
): Promise<SupportTicket> {
  const ticket = await mutate(tenantId, ticketId, (t) => {
    t.status = 'RESOLVED';
    if (!t.resolvedAt) t.resolvedAt = new Date();
  });
  afterResolve(tenantId, ticket, actorUserId);
  return ticket;
}

/** Close a ticket (terminal). */
export async function close(
  tenantId: string,
  ticketId: string,
  actorUserId?: string | null,
): Promise<SupportTicket> {
  const ticket = await mutate(tenantId, ticketId, (t) => {
    t.status = 'CLOSED';
    if (!t.resolvedAt) t.resolvedAt = new Date();
  });
  afterResolve(tenantId, ticket, actorUserId);
  return ticket;
}
