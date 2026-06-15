import 'reflect-metadata';
import { tenantDataSourceFor } from '@/modules/db';
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { SupportTicket as SupportTicketEntity } from './entities/support_ticket.entity';
import { SupportTicketMessage as SupportTicketMessageEntity } from './entities/support_ticket_message.entity';
import {
  SupportTicketMessageSchema,
  SupportTicketSchema,
  SupportTicketWithMessagesSchema,
  type SupportTicket,
  type SupportTicketWithMessages,
} from './back_office.types';
import type { ListTicketsQuery } from './back_office.dto';
import { BACK_OFFICE_MESSAGES as MSG } from './back_office.messages';

export async function list(
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
export async function get(
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
