import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { MeteredBillingRun as MeteredBillingRunEntity } from './entities/metered_billing_run.entity';
import { MeteredBillingRunSchema, type MeteredBillingRun } from './metering.types';
import type { ListRunsQuery } from './metering.dto';
import { METERING_MESSAGES as MESSAGES } from './metering.messages';

export async function listRuns(
  tenantId: string,
  query: ListRunsQuery,
): Promise<{ data: MeteredBillingRun[]; total: number }> {
  const ds = await tenantDataSourceFor(tenantId);
  const where: Record<string, unknown> = { tenantId };
  if (query.subjectId) where.subjectId = query.subjectId;
  if (query.periodKey) where.periodKey = query.periodKey;
  if (query.status) where.status = query.status;
  const [rows, total] = await ds.getRepository(MeteredBillingRunEntity).findAndCount({
    where,
    order: { createdAt: 'DESC' },
    skip: query.page * query.pageSize,
    take: query.pageSize,
  });
  return { data: rows.map((r) => MeteredBillingRunSchema.parse(r)), total };
}

export async function getRun(tenantId: string, billingRunId: string): Promise<MeteredBillingRun> {
  const ds = await tenantDataSourceFor(tenantId);
  const row = await ds
    .getRepository(MeteredBillingRunEntity)
    .findOne({ where: { tenantId, billingRunId } });
  if (!row) throw new AppError(MESSAGES.BILLING_RUN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);
  return MeteredBillingRunSchema.parse(row);
}
