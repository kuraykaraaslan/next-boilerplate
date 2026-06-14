import { z } from 'zod';

/**
 * Back-office enums.
 *
 * The module provides two related back-office surfaces:
 *  - a GENERIC moderation / approval queue (`ApprovalQueueItem`) keyed by
 *    `(entityType, entityId)` so any owning module can route its entities
 *    through human review without this module knowing about them, and
 *  - a support-ticket desk (`SupportTicket` + `SupportTicketMessage`).
 *
 * Status vocabularies intentionally mirror the report/queue semantics used by
 * `modules/messaging` moderation so operators see a consistent lifecycle, but
 * the queue here is entity-agnostic (it never references a message row).
 */

// ── Approval queue ───────────────────────────────────────────────────────────

// Lifecycle of a queued item. Open states are PENDING / IN_REVIEW / ESCALATED;
// terminal states are APPROVED / REJECTED. A new submission for an entity that
// already has an open item is a no-op (idempotent submit).
export const ApprovalStatusEnum = z.enum([
  'PENDING', // freshly submitted, awaiting a reviewer
  'IN_REVIEW', // a reviewer claimed it
  'APPROVED', // terminal — accepted
  'REJECTED', // terminal — declined
  'ESCALATED', // bumped to a higher tier, still open
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusEnum>;

// The non-terminal states that count as "an open item already exists". The
// partial unique index on the entity enforces at-most-one open item per
// (tenant, entityType, entityId).
export const OPEN_APPROVAL_STATUSES: readonly ApprovalStatus[] = [
  'PENDING',
  'IN_REVIEW',
  'ESCALATED',
] as const;

// A reviewer decision. APPROVE / REJECT are terminal; ESCALATE keeps the item
// open but flags it for a higher tier.
export const ApprovalDecisionEnum = z.enum(['APPROVE', 'REJECT', 'ESCALATE']);
export type ApprovalDecision = z.infer<typeof ApprovalDecisionEnum>;

// Maps a decision to the status it transitions the item into.
export const DECISION_TO_STATUS: Readonly<Record<ApprovalDecision, ApprovalStatus>> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  ESCALATE: 'ESCALATED',
} as const;

// ── Support tickets ──────────────────────────────────────────────────────────

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
