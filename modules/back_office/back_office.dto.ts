import { z } from 'zod';
import {
  ApprovalDecisionEnum,
  ApprovalStatusEnum,
  TicketAuthorTypeEnum,
  TicketPriorityEnum,
  TicketStatusEnum,
} from './back_office.enums';

/**
 * Request DTOs for the back-office routes. Mirrors the wallet module's DTO
 * conventions: trim/normalize at the boundary, cap free-text lengths, coerce
 * query params, and keep server-derived fields (the acting user) out of the
 * body schema (the route injects them after auth).
 */

// ── Approval queue ───────────────────────────────────────────────────────────

export const SubmitApprovalDTO = z.object({
  // A free-form domain tag identifying the kind of entity under review. The
  // queue never interprets it beyond routing the registered decision handler.
  entityType: z.string().min(1).max(64),
  entityId: z.string().uuid(),
  // The user who submitted / triggered the item (notified on decision). Null
  // for system-flagged items.
  submittedByUserId: z.string().uuid().nullable().optional(),
  // Higher = more urgent; drives the SLA bucket.
  priority: z.coerce.number().int().min(0).max(3).default(0),
  reason: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type SubmitApprovalDTO = z.infer<typeof SubmitApprovalDTO>;

export const DecideApprovalDTO = z.object({
  decision: ApprovalDecisionEnum,
  note: z.string().max(2000).optional(),
});
export type DecideApprovalDTO = z.infer<typeof DecideApprovalDTO>;

// PATCH body for an approval item — either a claim or a decision.
export const ApprovalActionDTO = z
  .object({
    action: z.enum(['claim', 'decide']),
    decision: ApprovalDecisionEnum.optional(),
    note: z.string().max(2000).optional(),
  })
  .refine((v) => v.action !== 'decide' || !!v.decision, {
    message: 'A decision is required when action is "decide"',
    path: ['decision'],
  });
export type ApprovalActionDTO = z.infer<typeof ApprovalActionDTO>;

export const ListApprovalsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: ApprovalStatusEnum.optional(),
  entityType: z.string().max(64).optional(),
  entityId: z.string().uuid().optional(),
  reviewedByUserId: z.string().uuid().optional(),
  priority: z.coerce.number().int().min(0).max(3).optional(),
});
export type ListApprovalsQuery = z.infer<typeof ListApprovalsQuery>;

// ── Support tickets ──────────────────────────────────────────────────────────

export const CreateTicketDTO = z.object({
  // The requester may be an authenticated tenant user (id) and always carries
  // an email so anonymous / pre-auth contact still works.
  requesterUserId: z.string().uuid().nullable().optional(),
  requesterEmail: z.string().email().max(320),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20000),
  priority: TicketPriorityEnum.default('NORMAL'),
  category: z.string().max(64).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTicketDTO = z.infer<typeof CreateTicketDTO>;

export const ReplyTicketDTO = z.object({
  ticketId: z.string().uuid(),
  authorUserId: z.string().uuid().nullable().optional(),
  authorType: TicketAuthorTypeEnum,
  body: z.string().min(1).max(20000),
  // Agent-only internal note — never surfaced to the requester.
  internal: z.coerce.boolean().default(false),
  attachments: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type ReplyTicketDTO = z.infer<typeof ReplyTicketDTO>;

// PATCH body for a ticket — assign, change status, resolve, or close.
export const TicketActionDTO = z
  .object({
    action: z.enum(['assign', 'status', 'resolve', 'close']),
    assignedToUserId: z.string().uuid().nullable().optional(),
    status: TicketStatusEnum.optional(),
  })
  .refine((v) => v.action !== 'status' || !!v.status, {
    message: 'A status is required when action is "status"',
    path: ['status'],
  });
export type TicketActionDTO = z.infer<typeof TicketActionDTO>;

export const ListTicketsQuery = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: TicketStatusEnum.optional(),
  priority: TicketPriorityEnum.optional(),
  assignedToUserId: z.string().uuid().optional(),
  category: z.string().max(64).optional(),
});
export type ListTicketsQuery = z.infer<typeof ListTicketsQuery>;
