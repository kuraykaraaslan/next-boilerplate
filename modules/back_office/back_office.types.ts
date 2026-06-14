import { z } from 'zod';
import {
  ApprovalStatusEnum,
  TicketAuthorTypeEnum,
  TicketPriorityEnum,
  TicketStatusEnum,
} from './back_office.enums';

/**
 * Parsed/serialized shapes for back-office rows. These mirror the entities but
 * normalize dates and guarantee `JSON.stringify`-safe output, exactly like the
 * wallet module's `*.types.ts`.
 */

export const ApprovalQueueItemSchema = z.object({
  approvalItemId: z.string().uuid(),
  tenantId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  submittedByUserId: z.string().uuid().nullable(),
  status: ApprovalStatusEnum,
  priority: z.number().int(),
  reason: z.string().nullable(),
  decisionNote: z.string().nullable(),
  reviewedByUserId: z.string().uuid().nullable(),
  reviewedAt: z.date().nullable(),
  slaDueAt: z.date().nullable(),
  prevHash: z.string().nullable(),
  rowHash: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ApprovalQueueItem = z.infer<typeof ApprovalQueueItemSchema>;

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

/** Result of re-deriving the per-tenant approval decision hash chain. */
export interface ApprovalChainVerificationResult {
  ok: boolean;
  checked: number;
  brokenAt: string | null;
}

/**
 * In-memory hook a downstream module registers so it can react to a terminal
 * approval decision (e.g. publish the approved entity). It is fire-and-forget:
 * a thrown/ rejected handler is logged and swallowed so it can never break the
 * decision write.
 */
export type ApprovalDecisionHandler = (event: {
  tenantId: string;
  item: ApprovalQueueItem;
}) => void | Promise<void>;
