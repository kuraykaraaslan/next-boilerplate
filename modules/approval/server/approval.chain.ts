import 'reflect-metadata';
import { type EntityManager } from 'typeorm';
import { tenantDataSourceFor } from '@nb/db';
import { ApprovalQueueItem as ApprovalQueueItemEntity } from './entities/approval_queue_item.entity';
import type { ApprovalChainVerificationResult } from './approval.types';
import { computeRowHash } from './approval.constants';

/**
 * Append-only chain link, computed once when an item is first inserted. Links
 * the new row to the previous head for the tenant (the row with the latest
 * `createdAt`, excluding the row itself). Only immutable insert-time content
 * is hashed, so later claim / decide mutations never invalidate the chain.
 * Runs inside the caller's transaction so the head read + write are atomic.
 */
export async function chainOnInsert(
  manager: EntityManager,
  tenantId: string,
  row: ApprovalQueueItemEntity,
): Promise<ApprovalQueueItemEntity> {
  const repo = manager.getRepository(ApprovalQueueItemEntity);
  const prev = await repo.findOne({
    where: { tenantId },
    order: { createdAt: 'DESC' },
  });
  const prevHash = prev && prev.approvalItemId !== row.approvalItemId ? prev.rowHash : null;
  row.prevHash = prevHash;
  row.rowHash = computeRowHash(prevHash, {
    approvalItemId: row.approvalItemId,
    tenantId: row.tenantId,
    entityType: row.entityType,
    entityId: row.entityId,
    submittedByUserId: row.submittedByUserId,
    priority: row.priority,
    reason: row.reason,
    createdAt: row.createdAt,
  });
  return repo.save(row);
}

/**
 * Re-derive the per-tenant decision hash chain and confirm every `rowHash`
 * matches. Any after-the-fact edit to a decision breaks the chain at that row.
 */
export async function verifyChain(tenantId: string): Promise<ApprovalChainVerificationResult> {
  const ds = await tenantDataSourceFor(tenantId);
  const rows = await ds.getRepository(ApprovalQueueItemEntity).find({
    where: { tenantId },
    order: { createdAt: 'ASC' },
  });

  let expectedPrev: string | null = null;
  let checked = 0;
  for (const row of rows) {
    checked += 1;
    if ((row.prevHash ?? null) !== expectedPrev) {
      return { ok: false, checked, brokenAt: row.approvalItemId };
    }
    const recomputed = computeRowHash(expectedPrev, {
      approvalItemId: row.approvalItemId,
      tenantId: row.tenantId,
      entityType: row.entityType,
      entityId: row.entityId,
      submittedByUserId: row.submittedByUserId,
      priority: row.priority,
      reason: row.reason,
      createdAt: row.createdAt,
    });
    if (recomputed !== (row.rowHash ?? null)) {
      return { ok: false, checked, brokenAt: row.approvalItemId };
    }
    expectedPrev = row.rowHash ?? null;
  }
  return { ok: true, checked, brokenAt: null };
}
