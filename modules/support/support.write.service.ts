import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import Logger from '@/modules/logger';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import WebhookService from '@/modules/webhook/webhook.service';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import NotificationInAppService from '@/modules/notification_inapp/notification_inapp.service';
import { SupportTicket as SupportTicketEntity } from './entities/support_ticket.entity';
import { SupportTicketMessage as SupportTicketMessageEntity } from './entities/support_ticket_message.entity';
import {
  SupportTicketMessageSchema,
  SupportTicketSchema,
  SupportTicketWithMessagesSchema,
  type SupportTicketMessage,
  type SupportTicketWithMessages,
} from './support.types';
import type { CreateTicketDTO, ReplyTicketDTO } from './support.dto';
import { SUPPORT_MESSAGES as MSG } from './support.messages';
import { ticketSlaDueAt } from './support.constants';
import { allocateTicketNumber } from './support.numbering';

const UNIQUE_VIOLATION = '23505';

/**
 * Open a ticket plus its first (REQUESTER) message. Allocates a ticket number,
 * computes `slaDueAt` from priority, audits the creation, notifies the
 * assigned agent (if any), and fires `support.ticket.created`.
 * Retries once on a ticket-number unique collision (lost allocation race).
 */
export async function createTicket(tenantId: string, dto: CreateTicketDTO): Promise<SupportTicketWithMessages> {
  const ds = await tenantDataSourceFor(tenantId);

  const attempt = async (): Promise<{ ticket: SupportTicketEntity; firstMessage: SupportTicketMessageEntity }> =>
    ds.transaction(async (manager) => {
      const ticketRepo = manager.getRepository(SupportTicketEntity);
      const msgRepo = manager.getRepository(SupportTicketMessageEntity);

      const createdAt = new Date();
      const ticketNumber = await allocateTicketNumber(manager, tenantId, createdAt);
      const ticket = await ticketRepo.save(
        ticketRepo.create({
          tenantId,
          ticketNumber,
          requesterUserId: dto.requesterUserId ?? null,
          requesterEmail: dto.requesterEmail,
          subject: dto.subject,
          status: 'OPEN',
          priority: dto.priority,
          category: dto.category ?? null,
          assignedToUserId: dto.assignedToUserId ?? null,
          firstResponseAt: null,
          resolvedAt: null,
          slaDueAt: ticketSlaDueAt(dto.priority, createdAt),
          metadata: dto.metadata ?? null,
        }),
      );

      const firstMessage = await msgRepo.save(
        msgRepo.create({
          tenantId,
          ticketId: ticket.ticketId,
          authorUserId: dto.requesterUserId ?? null,
          authorType: 'REQUESTER',
          body: dto.body,
          internal: false,
          attachments: null,
        }),
      );

      return { ticket, firstMessage };
    });

  let result: { ticket: SupportTicketEntity; firstMessage: SupportTicketMessageEntity };
  try {
    result = await attempt();
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      result = await attempt(); // one retry on a number collision
    } else {
      if (!(error instanceof AppError)) Logger.error(`${MSG.TICKET_CREATE_FAILED}: ${error}`);
      throw error;
    }
  }

  const ticket = SupportTicketSchema.parse(result.ticket);

  void AuditLogService.log({
    tenantId,
    actorId: dto.requesterUserId ?? null,
    actorType: dto.requesterUserId ? 'USER' : 'SYSTEM',
    action: 'support.ticket.created',
    resourceType: 'support_ticket',
    resourceId: ticket.ticketId,
    metadata: { ticketNumber: ticket.ticketNumber, priority: ticket.priority },
  });

  if (ticket.assignedToUserId) {
    void NotificationInAppService.push(tenantId, ticket.assignedToUserId, {
      title: `Ticket ${ticket.ticketNumber} assigned to you`,
      message: ticket.subject,
      type: 'support',
    }).catch((err) => Logger.error(`[support] notify agent failed: ${err}`));
  }

  void WebhookService.dispatchEvent(tenantId, 'support.ticket.created', {
    ticketId: ticket.ticketId,
    ticketNumber: ticket.ticketNumber,
    priority: ticket.priority,
    requesterEmail: ticket.requesterEmail,
  }).catch((err) => Logger.error(`[support] webhook dispatch failed: ${err}`));

  return SupportTicketWithMessagesSchema.parse({
    ...ticket,
    messages: [SupportTicketMessageSchema.parse(result.firstMessage)],
  });
}

/**
 * Append a message to a ticket. An AGENT reply sets `firstResponseAt` (once)
 * and flips the ticket to PENDING (awaiting requester); a REQUESTER reply
 * flips it back to OPEN. Internal notes never change status and never notify
 * the requester. The other party is notified (fire-and-forget).
 */
export async function reply(tenantId: string, dto: ReplyTicketDTO): Promise<SupportTicketMessage> {
  const ds = await tenantDataSourceFor(tenantId);
  const { ticket, message } = await ds.transaction(async (manager) => {
    const ticketRepo = manager.getRepository(SupportTicketEntity);
    const msgRepo = manager.getRepository(SupportTicketMessageEntity);

    const ticketRow = await ticketRepo.findOne({
      where: { tenantId, ticketId: dto.ticketId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ticketRow) throw new AppError(MSG.TICKET_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (ticketRow.status === 'CLOSED') {
      throw new AppError(MSG.TICKET_CLOSED, 409, ErrorCode.CONFLICT);
    }

    const saved = await msgRepo.save(
      msgRepo.create({
        tenantId,
        ticketId: dto.ticketId,
        authorUserId: dto.authorUserId ?? null,
        authorType: dto.authorType,
        body: dto.body,
        internal: dto.internal,
        attachments: dto.attachments ?? null,
      }),
    );

    // Public (non-internal) replies drive status + first-response tracking.
    if (!dto.internal) {
      if (dto.authorType === 'AGENT') {
        if (!ticketRow.firstResponseAt) ticketRow.firstResponseAt = new Date();
        ticketRow.status = 'PENDING';
      } else if (dto.authorType === 'REQUESTER') {
        ticketRow.status = 'OPEN';
      }
      await ticketRepo.save(ticketRow);
    }

    return { ticket: ticketRow, message: saved };
  });

  const msg = SupportTicketMessageSchema.parse(message);

  if (!dto.internal) {
    // Notify the OTHER party: agent reply → requester; requester reply → agent.
    if (dto.authorType === 'AGENT' && ticket.requesterUserId) {
      void NotificationInAppService.push(tenantId, ticket.requesterUserId, {
        title: `New reply on ticket ${ticket.ticketNumber}`,
        message: dto.body.slice(0, 280),
        type: 'support',
      }).catch((err) => Logger.error(`[support] notify requester failed: ${err}`));
    } else if (dto.authorType === 'REQUESTER' && ticket.assignedToUserId) {
      void NotificationInAppService.push(tenantId, ticket.assignedToUserId, {
        title: `Requester replied on ticket ${ticket.ticketNumber}`,
        message: dto.body.slice(0, 280),
        type: 'support',
      }).catch((err) => Logger.error(`[support] notify agent failed: ${err}`));
    }

    void WebhookService.dispatchEvent(tenantId, 'support.ticket.replied', {
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      authorType: dto.authorType,
    }).catch((err) => Logger.error(`[support] webhook dispatch failed: ${err}`));
  }

  return msg;
}
