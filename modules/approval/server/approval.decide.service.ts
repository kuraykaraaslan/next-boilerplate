import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import Logger from '@kuraykaraaslan/logger';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import WebhookService from '@kuraykaraaslan/webhook/server/webhook.service';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import NotificationInAppService from '@kuraykaraaslan/notification_inapp/server/notification_inapp.service';
import { ApprovalQueueItem as ApprovalQueueItemEntity } from './entities/approval_queue_item.entity';
import { ApprovalQueueItemSchema, type ApprovalQueueItem } from './approval.types';
import type { DecideApprovalDTO } from './approval.dto';
import { APPROVAL_MESSAGES as MSG } from './approval.messages';
import { DECISION_TO_STATUS } from './approval.enums';
import { onDecision } from './approval.handlers';

/**
 * Record a reviewer decision. Allowed transitions:
 *  - APPROVE / REJECT (terminal) from PENDING | IN_REVIEW | ESCALATED
 *  - ESCALATE (stays open) from PENDING | IN_REVIEW
 * Already-terminal items are rejected with CONFLICT.
 *
 * On a terminal decision the per-tenant audit log is written, the registered
 * decision handler is invoked, the submitter is notified (fire-and-forget),
 * and a `approval.<approved|rejected|escalated>` webhook fires.
 */
export async function decide(
  tenantId: string,
  reviewerUserId: string,
  approvalItemId: string,
  dto: DecideApprovalDTO,
): Promise<ApprovalQueueItem> {
  const newStatus = DECISION_TO_STATUS[dto.decision];
  const ds = await tenantDataSourceFor(tenantId);
  try {
    const row = await ds.transaction(async (manager) => {
      const repo = manager.getRepository(ApprovalQueueItemEntity);
      const item = await repo.findOne({
        where: { tenantId, approvalItemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item) throw new AppError(MSG.APPROVAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

      // Guard the transition: terminal items are immutable; ESCALATE only
      // from a still-actionable (not already escalated) open state.
      if (item.status === 'APPROVED' || item.status === 'REJECTED') {
        throw new AppError(MSG.ALREADY_DECIDED, 409, ErrorCode.CONFLICT);
      }
      if (dto.decision === 'ESCALATE' && item.status === 'ESCALATED') {
        throw new AppError(MSG.INVALID_TRANSITION, 409, ErrorCode.CONFLICT);
      }

      item.status = newStatus;
      item.reviewedByUserId = reviewerUserId;
      item.decisionNote = dto.note ?? item.decisionNote ?? null;
      // reviewedAt marks when the decision was taken (terminal or escalation).
      item.reviewedAt = new Date();
      return repo.save(item);
    });

    const item = ApprovalQueueItemSchema.parse(row);
    const isTerminal = newStatus === 'APPROVED' || newStatus === 'REJECTED';

    // Audit every decision (approve / reject / escalate). Never throws.
    void AuditLogService.log({
      tenantId,
      actorId: reviewerUserId,
      actorType: 'USER',
      action: `approval.${dto.decision.toLowerCase()}`,
      resourceType: item.entityType,
      resourceId: item.entityId,
      metadata: {
        approvalItemId: item.approvalItemId,
        decision: dto.decision,
        note: dto.note ?? null,
        rowHash: item.rowHash,
      },
    });

    // Let the owning module react to terminal decisions.
    if (isTerminal) onDecision(tenantId, item);

    // Notify the submitter (fire-and-forget) if known.
    if (item.submittedByUserId) {
      void NotificationInAppService.push(tenantId, item.submittedByUserId, {
        title: `Your submission was ${newStatus.toLowerCase()}`,
        message:
          dto.note ??
          `Your ${item.entityType} submission has been ${newStatus.toLowerCase()}.`,
        type: 'approval',
      }).catch((err) =>
        Logger.error(`[approval] notify submitter failed: ${err}`),
      );
    }

    const event =
      dto.decision === 'APPROVE'
        ? 'approval.approved'
        : dto.decision === 'REJECT'
          ? 'approval.rejected'
          : 'approval.escalated';
    void WebhookService.dispatchEvent(tenantId, event, {
      approvalItemId: item.approvalItemId,
      entityType: item.entityType,
      entityId: item.entityId,
      status: item.status,
      reviewedByUserId: reviewerUserId,
    }).catch((err) => Logger.error(`[approval] webhook dispatch failed: ${err}`));

    return item;
  } catch (error) {
    if (!(error instanceof AppError)) Logger.error(`${MSG.DECIDE_FAILED}: ${error}`);
    throw error;
  }
}
