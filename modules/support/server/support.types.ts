import { z } from 'zod';
import {
  TicketAuthorTypeEnum,
  TicketPriorityEnum,
  TicketStatusEnum,
} from './support.enums';

/**
 * Parsed/serialized shapes for support-ticket rows. These mirror the entities
 * but normalize dates and guarantee `JSON.stringify`-safe output, exactly like
 * the wallet module's `*.types.ts`.
 */

export const SupportTicketSchema = z.object({
  ticketId: z.string().uuid(),
  tenantId: z.string().uuid(),
  ticketNumber: z.string(),
  requesterUserId: z.string().uuid().nullable(),
  requesterEmail: z.string(),
  subject: z.string(),
  status: TicketStatusEnum,
  priority: TicketPriorityEnum,
  category: z.string().nullable(),
  assignedToUserId: z.string().uuid().nullable(),
  firstResponseAt: z.date().nullable(),
  resolvedAt: z.date().nullable(),
  slaDueAt: z.date().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;

export const SupportTicketMessageSchema = z.object({
  ticketMessageId: z.string().uuid(),
  tenantId: z.string().uuid(),
  ticketId: z.string().uuid(),
  authorUserId: z.string().uuid().nullable(),
  authorType: TicketAuthorTypeEnum,
  body: z.string(),
  internal: z.boolean(),
  attachments: z.array(z.record(z.string(), z.unknown())).nullable(),
  createdAt: z.date(),
});
export type SupportTicketMessage = z.infer<typeof SupportTicketMessageSchema>;

export const SupportTicketWithMessagesSchema = SupportTicketSchema.extend({
  messages: z.array(SupportTicketMessageSchema),
});
export type SupportTicketWithMessages = z.infer<typeof SupportTicketWithMessagesSchema>;
