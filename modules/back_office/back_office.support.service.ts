import 'reflect-metadata';
import { type EntityManager } from 'typeorm';
import type {
  SupportTicket,
  SupportTicketMessage,
  SupportTicketWithMessages,
} from './back_office.types';
import type { CreateTicketDTO, ListTicketsQuery, ReplyTicketDTO } from './back_office.dto';
import type { TicketStatus } from './back_office.enums';
import { allocateTicketNumber, getNextTicketNumber } from './back_office.support.numbering';
import { createTicket, reply } from './back_office.support.write.service';
import { assign, setStatus, resolve, close } from './back_office.support.lifecycle.service';
import { list, get } from './back_office.support.read.service';

/**
 * Support-ticket service facade. The implementation is split across focused
 * modules (`back_office.support.write.service`, `.lifecycle.service`,
 * `.read.service`, plus the `.numbering` helper); this class preserves the
 * single `SupportTicketService.*` entry point its callers depend on.
 */
export default class SupportTicketService {
  static allocateTicketNumber(manager: EntityManager, tenantId: string, at?: Date): Promise<string> {
    return allocateTicketNumber(manager, tenantId, at);
  }

  static getNextTicketNumber(tenantId: string): Promise<string> {
    return getNextTicketNumber(tenantId);
  }

  static createTicket(tenantId: string, dto: CreateTicketDTO): Promise<SupportTicketWithMessages> {
    return createTicket(tenantId, dto);
  }

  static reply(tenantId: string, dto: ReplyTicketDTO): Promise<SupportTicketMessage> {
    return reply(tenantId, dto);
  }

  static assign(tenantId: string, ticketId: string, assignedToUserId: string | null, actorUserId?: string | null): Promise<SupportTicket> {
    return assign(tenantId, ticketId, assignedToUserId, actorUserId);
  }

  static setStatus(tenantId: string, ticketId: string, status: TicketStatus, actorUserId?: string | null): Promise<SupportTicket> {
    return setStatus(tenantId, ticketId, status, actorUserId);
  }

  static resolve(tenantId: string, ticketId: string, actorUserId?: string | null): Promise<SupportTicket> {
    return resolve(tenantId, ticketId, actorUserId);
  }

  static close(tenantId: string, ticketId: string, actorUserId?: string | null): Promise<SupportTicket> {
    return close(tenantId, ticketId, actorUserId);
  }

  static list(tenantId: string, query: ListTicketsQuery): Promise<{ data: SupportTicket[]; total: number }> {
    return list(tenantId, query);
  }

  static get(tenantId: string, ticketId: string, includeInternal = false): Promise<SupportTicketWithMessages> {
    return get(tenantId, ticketId, includeInternal);
  }
}
