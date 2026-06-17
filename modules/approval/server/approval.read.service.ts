import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { ApprovalQueueItem as ApprovalQueueItemEntity } from './entities/approval_queue_item.entity';
import { ApprovalQueueItemSchema, type ApprovalQueueItem } from './approval.types';
import type { ListApprovalsQuery } from './approval.dto';
import { APPROVAL_MESSAGES as MSG } from './approval.messages';

export async function list(
  tenantId: string,
  query: ListApprovalsQuery,
): Promise<{ data: ApprovalQueueItem[]; total: number }> {
  const ds = await tenantDataSourceFor(tenantId);
  const where: Record<string, unknown> = { tenantId };
  if (query.status) where['status'] = query.status;
  if (query.entityType) where['entityType'] = query.entityType;
  if (query.entityId) where['entityId'] = query.entityId;
  if (query.reviewedByUserId) where['reviewedByUserId'] = query.reviewedByUserId;
  if (query.priority !== undefined) where['priority'] = query.priority;
  const [rows, total] = await ds.getRepository(ApprovalQueueItemEntity).findAndCount({
    where,
    // Most urgent first, then oldest — a sensible work queue order.
    order: { priority: 'DESC', createdAt: 'ASC' },
    skip: query.page * query.pageSize,
    take: query.pageSize,
  });
  return { data: rows.map((r) => ApprovalQueueItemSchema.parse(r)), total };
}

export async function get(tenantId: string, approvalItemId: string): Promise<ApprovalQueueItem> {
  const ds = await tenantDataSourceFor(tenantId);
  const row = await ds.getRepository(ApprovalQueueItemEntity).findOne({
    where: { tenantId, approvalItemId },
  });
  if (!row) throw new AppError(MSG.APPROVAL_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  return ApprovalQueueItemSchema.parse(row);
}
