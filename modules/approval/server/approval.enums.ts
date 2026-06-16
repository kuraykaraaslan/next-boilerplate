import { z } from 'zod';

/**
 * Approval-queue enums.
 *
 * A GENERIC moderation / approval queue (`ApprovalQueueItem`) keyed by
 * `(entityType, entityId)` so any owning module can route its entities through
 * human review without this module knowing about them.
 *
 * Status vocabularies intentionally mirror the report/queue semantics used by
 * `modules/messaging` moderation so operators see a consistent lifecycle, but
 * the queue here is entity-agnostic (it never references a message row).
 */

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
