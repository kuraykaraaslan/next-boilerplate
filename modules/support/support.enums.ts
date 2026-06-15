import { z } from 'zod';

/**
 * Support-ticket enums. The module is a support-ticket desk
 * (`SupportTicket` + `SupportTicketMessage`) with per-tenant monotonic ticket
 * numbers, agent assignment, internal notes and SLA tracking.
 */

export const TicketStatusEnum = z.enum([
  'OPEN', // awaiting an agent
  'PENDING', // agent replied, awaiting the requester
  'RESOLVED', // agent marked it solved
  'CLOSED', // finalized / archived
]);
export type TicketStatus = z.infer<typeof TicketStatusEnum>;

export const TicketPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export type TicketPriority = z.infer<typeof TicketPriorityEnum>;

// Who authored a ticket message. REQUESTER = the customer, AGENT = tenant
// staff, SYSTEM = automated note. Internal notes are AGENT-only.
export const TicketAuthorTypeEnum = z.enum(['REQUESTER', 'AGENT', 'SYSTEM']);
export type TicketAuthorType = z.infer<typeof TicketAuthorTypeEnum>;
