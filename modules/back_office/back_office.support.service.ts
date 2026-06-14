import 'reflect-metadata';
import { type EntityManager } from 'typeorm';
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
  type SupportTicket,
  type SupportTicketMessage,
  type SupportTicketWithMessages,
} from './back_office.types';
import type {
  CreateTicketDTO,
  ListTicketsQuery,
  ReplyTicketDTO,
} from './back_office.dto';
import { BACK_OFFICE_MESSAGES as MSG } from './back_office.messages';
import {
  TICKET_NUMBER_PADDING,
  TICKET_NUMBER_PREFIX,
  ticketSlaDueAt,
} from './back_office.constants';
import type { TicketStatus } from './back_office.enums';

const UNIQUE_VIOLATION = '23505';

export default class SupportTicketService {
  // ──────────────────────────────────────────────
  // Ticket-number sequence (mirror invoice.allocateNumber)
  // ──────────────────────────────────────────────

  /**
   * Allocate the next per-tenant, per-year ticket number inside an existing
   * transaction. Mirrors `InvoiceCrudService.allocateNumber`: a Postgres
   * advisory xact lock serializes concurrent allocations for the same
   * (tenant, year) prefix so two creates can't read the same MAX and collide on
   * the unique `(tenantId, ticketNumber)` index. Format: `TICK-2026-00001`.
   */
  static async allocateTicketNumber(
    manager: EntityManager,
    tenantId: string,
    at: Date = new Date(),
  ): Promise<string> {
    const year = at.getUTCFullYear();
    const search = `${TICKET_NUMBER_PREFIX}-${year}-`;

    // Postgres path: serialize on the (tenant, prefix) key. The fake DataSource
    // used in tests has no `query`, so this is best-effort.
    if (typeof manager.query === 'function') {
      try {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [
          `tick:${tenantId}:${search}`,
        ]);
      } catch {
        // non-Postgres / test stub — the unique index + retry still guard us
      }
    }

    const row = await manager
      .getRepository(SupportTicketEntity)
      .createQueryBuilder('t')
      .select('t.ticketNumber', 'ticketNumber')
      .where('t.tenantId = :tid', { tid: tenantId })
      .andWhere('t.ticketNumber LIKE :prefix', { prefix: `${search}%` })
      .orderBy('LENGTH(t.ticketNumber)', 'DESC')
      .addOrderBy('t.ticketNumber', 'DESC')
      .limit(1)
      .getRawOne<{ ticketNumber: string }>()
      .catch(() => null);

    const lastSeq = row?.ticketNumber ? parseInt(row.ticketNumber.split('-').pop() ?? '0', 10) : 0;
    const next = (lastSeq + 1).toString().padStart(TICKET_NUMBER_PADDING, '0');
    return `${search}${next}`;
  }

  /** Standalone allocator (its own transaction). */
  static async getNextTicketNumber(tenantId: string): Promise<string> {
    const ds = await tenantDataSourceFor(tenantId);
    return ds.transaction((manager) => SupportTicketService.allocateTicketNumber(manager, tenantId));
  }

  // ──────────────────────────────────────────────
  // Create
  // ──────────────────────────────────────────────

  /**
   * Open a ticket plus its first (REQUESTER) message. Allocates a ticket number,
   * computes `slaDueAt` from priority, audits the creation, notifies the
   * assigned agent (if any), and fires `back_office.ticket.created`.
   * Retries once on a ticket-number unique collision (lost allocation race).
   */
  static async createTicket(tenantId: string, dto: CreateTicketDTO): Promise<SupportTicketWithMessages> {
    const ds = await tenantDataSourceFor(tenantId);

    const attempt = async (): Promise<{ ticket: SupportTicketEntity; firstMessage: SupportTicketMessageEntity }> =>
      ds.transaction(async (manager) => {
        const ticketRepo = manager.getRepository(SupportTicketEntity);
        const msgRepo = manager.getRepository(SupportTicketMessageEntity);

        const createdAt = new Date();
        const ticketNumber = await SupportTicketService.allocateTicketNumber(manager, tenantId, createdAt);
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
      action: 'back_office.ticket.created',
      resourceType: 'support_ticket',
      resourceId: ticket.ticketId,
      metadata: { ticketNumber: ticket.ticketNumber, priority: ticket.priority },
    });

    if (ticket.assignedToUserId) {
      void NotificationInAppService.push(tenantId, ticket.assignedToUserId, {
        title: `Ticket ${ticket.ticketNumber} assigned to you`,
        message: ticket.subject,
        type: 'back_office',
      }).catch((err) => Logger.error(`[back_office] notify agent failed: ${err}`));
    }

    void WebhookService.dispatchEvent(tenantId, 'back_office.ticket.created', {
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      priority: ticket.priority,
      requesterEmail: ticket.requesterEmail,
    }).catch((err) => Logger.error(`[back_office] webhook dispatch failed: ${err}`));

    return SupportTicketWithMessagesSchema.parse({
      ...ticket,
      messages: [SupportTicketMessageSchema.parse(result.firstMessage)],
    });
  }

  // ──────────────────────────────────────────────
  // Reply
  // ──────────────────────────────────────────────

  /**
   * Append a message to a ticket. An AGENT reply sets `firstResponseAt` (once)
   * and flips the ticket to PENDING (awaiting requester); a REQUESTER reply
   * flips it back to OPEN. Internal notes never change status and never notify
   * the requester. The other party is notified (fire-and-forget).
   */
  static async reply(tenantId: string, dto: ReplyTicketDTO): Promise<SupportTicketMessage> {
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
          type: 'back_office',
        }).catch((err) => Logger.error(`[back_office] notify requester failed: ${err}`));
      } else if (dto.authorType === 'REQUESTER' && ticket.assignedToUserId) {
        void NotificationInAppService.push(tenantId, ticket.assignedToUserId, {
          title: `Requester replied on ticket ${ticket.ticketNumber}`,
          message: dto.body.slice(0, 280),
          type: 'back_office',
        }).catch((err) => Logger.error(`[back_office] notify agent failed: ${err}`));
      }

      void WebhookService.dispatchEvent(tenantId, 'back_office.ticket.replied', {
        ticketId: ticket.ticketId,
        ticketNumber: ticket.ticketNumber,
        authorType: dto.authorType,
      }).catch((err) => Logger.error(`[back_office] webhook dispatch failed: ${err}`));
    }

    return msg;
  }

  // ──────────────────────────────────────────────
  // Lifecycle mutations
  // ──────────────────────────────────────────────

  /** Assign (or unassign with null) a ticket to an agent. */
  static async assign(
    tenantId: string,
    ticketId: string,
    assignedToUserId: string | null,
    actorUserId?: string | null,
  ): Promise<SupportTicket> {
    const ticket = await SupportTicketService.mutate(tenantId, ticketId, (t) => {
      t.assignedToUserId = assignedToUserId;
    });
    void AuditLogService.log({
      tenantId,
      actorId: actorUserId ?? null,
      actorType: actorUserId ? 'USER' : 'SYSTEM',
      action: 'back_office.ticket.assigned',
      resourceType: 'support_ticket',
      resourceId: ticketId,
      metadata: { assignedToUserId },
    });
    if (assignedToUserId) {
      void NotificationInAppService.push(tenantId, assignedToUserId, {
        title: `Ticket ${ticket.ticketNumber} assigned to you`,
        message: ticket.subject,
        type: 'back_office',
      }).catch((err) => Logger.error(`[back_office] notify agent failed: ${err}`));
    }
    return ticket;
  }

  /** Set an explicit status (OPEN | PENDING | RESOLVED | CLOSED). */
  static async setStatus(
    tenantId: string,
    ticketId: string,
    status: TicketStatus,
    actorUserId?: string | null,
  ): Promise<SupportTicket> {
    const ticket = await SupportTicketService.mutate(tenantId, ticketId, (t) => {
      t.status = status;
      if (status === 'RESOLVED' && !t.resolvedAt) t.resolvedAt = new Date();
      if (status === 'OPEN' || status === 'PENDING') t.resolvedAt = null;
    });
    if (status === 'RESOLVED' || status === 'CLOSED') {
      SupportTicketService.afterResolve(tenantId, ticket, actorUserId);
    }
    return ticket;
  }

  /** Mark a ticket RESOLVED, stamping `resolvedAt`. */
  static async resolve(
    tenantId: string,
    ticketId: string,
    actorUserId?: string | null,
  ): Promise<SupportTicket> {
    const ticket = await SupportTicketService.mutate(tenantId, ticketId, (t) => {
      t.status = 'RESOLVED';
      if (!t.resolvedAt) t.resolvedAt = new Date();
    });
    SupportTicketService.afterResolve(tenantId, ticket, actorUserId);
    return ticket;
  }

  /** Close a ticket (terminal). */
  static async close(
    tenantId: string,
    ticketId: string,
    actorUserId?: string | null,
  ): Promise<SupportTicket> {
    const ticket = await SupportTicketService.mutate(tenantId, ticketId, (t) => {
      t.status = 'CLOSED';
      if (!t.resolvedAt) t.resolvedAt = new Date();
    });
    SupportTicketService.afterResolve(tenantId, ticket, actorUserId);
    return ticket;
  }

  // ──────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────

  static async list(
    tenantId: string,
    query: ListTicketsQuery,
  ): Promise<{ data: SupportTicket[]; total: number }> {
    const ds = await tenantDataSourceFor(tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (query.status) where['status'] = query.status;
    if (query.priority) where['priority'] = query.priority;
    if (query.assignedToUserId) where['assignedToUserId'] = query.assignedToUserId;
    if (query.category) where['category'] = query.category;
    const [rows, total] = await ds.getRepository(SupportTicketEntity).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.page * query.pageSize,
      take: query.pageSize,
    });
    return { data: rows.map((r) => SupportTicketSchema.parse(r)), total };
  }

  /**
   * Fetch a ticket with its messages. `includeInternal` (admin path only)
   * controls whether agent-only internal notes are returned; the requester read
   * path passes `false` so internal notes stay hidden.
   */
  static async get(
    tenantId: string,
    ticketId: string,
    includeInternal = false,
  ): Promise<SupportTicketWithMessages> {
    const ds = await tenantDataSourceFor(tenantId);
    const ticket = await ds.getRepository(SupportTicketEntity).findOne({
      where: { tenantId, ticketId },
    });
    if (!ticket) throw new AppError(MSG.TICKET_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

    const messages = await ds.getRepository(SupportTicketMessageEntity).find({
      where: { tenantId, ticketId },
      order: { createdAt: 'ASC' },
    });
    const visible = includeInternal ? messages : messages.filter((m) => !m.internal);

    return SupportTicketWithMessagesSchema.parse({
      ...SupportTicketSchema.parse(ticket),
      messages: visible.map((m) => SupportTicketMessageSchema.parse(m)),
    });
  }

  // ──────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────

  /** Load + pessimistically lock a ticket, apply a mutator, save, and return it. */
  private static async mutate(
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
  private static afterResolve(
    tenantId: string,
    ticket: SupportTicket,
    actorUserId?: string | null,
  ): void {
    void AuditLogService.log({
      tenantId,
      actorId: actorUserId ?? null,
      actorType: actorUserId ? 'USER' : 'SYSTEM',
      action: `back_office.ticket.${ticket.status.toLowerCase()}`,
      resourceType: 'support_ticket',
      resourceId: ticket.ticketId,
      metadata: { ticketNumber: ticket.ticketNumber, status: ticket.status },
    });
    if (ticket.requesterUserId) {
      void NotificationInAppService.push(tenantId, ticket.requesterUserId, {
        title: `Ticket ${ticket.ticketNumber} ${ticket.status.toLowerCase()}`,
        message: ticket.subject,
        type: 'back_office',
      }).catch((err) => Logger.error(`[back_office] notify requester failed: ${err}`));
    }
    void WebhookService.dispatchEvent(tenantId, 'back_office.ticket.resolved', {
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
    }).catch((err) => Logger.error(`[back_office] webhook dispatch failed: ${err}`));
  }
}
