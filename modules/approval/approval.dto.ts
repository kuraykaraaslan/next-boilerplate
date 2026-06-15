import { z } from 'zod';
import { ApprovalDecisionEnum, ApprovalStatusEnum } from './approval.enums';

/**
 * Request DTOs for the approval-queue routes. Mirrors the wallet module's DTO
 * conventions: trim/normalize at the boundary, cap free-text lengths, coerce
 * query params, and keep server-derived fields (the acting user) out of the
 * body schema (the route injects them after auth).
 */

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
