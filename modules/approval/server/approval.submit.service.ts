import 'reflect-metadata';
import { In } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import Logger from '@nb/logger';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import WebhookService from '@nb/webhook/server/webhook.service';
import { ApprovalQueueItem as ApprovalQueueItemEntity } from './entities/approval_queue_item.entity';
import { ApprovalQueueItemSchema, type ApprovalQueueItem } from './approval.types';
import type { SubmitApprovalDTO } from './approval.dto';
import { APPROVAL_MESSAGES as MSG } from './approval.messages';
import { approvalSlaDueAt } from './approval.constants';
import { OPEN_APPROVAL_STATUSES } from './approval.enums';
import { chainOnInsert } from './approval.chain';

const UNIQUE_VIOLATION = '23505';

/**
 * Submit an entity for review. Idempotent: if an OPEN item already exists for
 * `(entityType, entityId)` it is returned unchanged; otherwise a PENDING item
 * is created, hash-chained, and a `approval.submitted` webhook is
 * fired (fire-and-forget).
 */
export async function submit(tenantId: string, dto: SubmitApprovalDTO): Promise<ApprovalQueueItem> {
  const ds = await tenantDataSourceFor(tenantId);
  try {
    const saved = await ds.transaction(async (manager) => {
      const repo = manager.getRepository(ApprovalQueueItemEntity);

      const existing = await repo.findOne({
        where: {
          tenantId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          status: In([...OPEN_APPROVAL_STATUSES]),
        },
        order: { createdAt: 'DESC' },
      });
      if (existing) return { row: existing, created: false };

      const createdAt = new Date();
      const built = repo.create({
        tenantId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        submittedByUserId: dto.submittedByUserId ?? null,
        status: 'PENDING',
        priority: dto.priority,
        reason: dto.reason ?? null,
        decisionNote: null,
        reviewedByUserId: null,
        reviewedAt: null,
        slaDueAt: approvalSlaDueAt(dto.priority, createdAt),
        metadata: dto.metadata ?? null,
        createdAt,
      });
      const persisted = await repo.save(built);
      const chained = await chainOnInsert(manager, tenantId, persisted);
      return { row: chained, created: true };
    });

    const item = ApprovalQueueItemSchema.parse(saved.row);
    if (saved.created) {
      void WebhookService.dispatchEvent(tenantId, 'approval.submitted', {
        approvalItemId: item.approvalItemId,
        entityType: item.entityType,
        entityId: item.entityId,
        priority: item.priority,
      }).catch((err) => Logger.error(`[approval] webhook dispatch failed: ${err}`));
    }
    return item;
  } catch (error) {
    // Lost the create race against the partial unique index — re-read the open item.
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      const row = await ds.getRepository(ApprovalQueueItemEntity).findOne({
        where: {
          tenantId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          status: In([...OPEN_APPROVAL_STATUSES]),
        },
        order: { createdAt: 'DESC' },
      });
      if (row) return ApprovalQueueItemSchema.parse(row);
    }
    if (!(error instanceof AppError)) Logger.error(`${MSG.SUBMIT_FAILED}: ${error}`);
    throw error;
  }
}

/** Claim a PENDING item for review (PENDING → IN_REVIEW). */
export async function claim(
  tenantId: string,
  reviewerUserId: string,
  approvalItemId: string,
): Promise<ApprovalQueueItem> {
  const ds = await tenantDataSourceFor(tenantId);
  const row = await ds.transaction(async (manager) => {
    const repo = manager.getRepository(ApprovalQueueItemEntity);
    const item = await repo.findOne({
      where: { tenantId, approvalItemId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!item) throw new AppError(MSG.APPROVAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
    if (item.status !== 'PENDING') {
      throw new AppError(MSG.CLAIM_FAILED, 409, ErrorCode.CONFLICT);
    }
    item.status = 'IN_REVIEW';
    item.reviewedByUserId = reviewerUserId;
    // Decision/claim mutations do not re-chain (the chain is insert-only over
    // immutable content); the append-only audit_log records who acted.
    return repo.save(item);
  });
  return ApprovalQueueItemSchema.parse(row);
}
