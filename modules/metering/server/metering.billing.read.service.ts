import 'reflect-metadata';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { MeteredBillingRun as MeteredBillingRunEntity } from './entities/metered_billing_run.entity';
import { MeteredUsageEvent as MeteredUsageEventEntity } from './entities/metered_usage_event.entity';
import {
  MeteredBillingRunSchema,
  MeteredUsageEventSchema,
  type MeteredBillingRun,
  type MeteredUsageEvent,
} from './metering.types';
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

/**
 * Read-only usage-event lines underlying a run — the immutable
 * `MeteredUsageEvent` rows for the run's subject and period. These are the raw
 * facts the run's per-meter `lines` snapshot was computed from; they are never
 * edited from the document (usage is append-only).
 */
export async function listRunEvents(
  tenantId: string,
  billingRunId: string,
  page = 0,
  pageSize = 200,
): Promise<{ data: MeteredUsageEvent[]; total: number }> {
  const ds = await tenantDataSourceFor(tenantId);
  const run = await ds
    .getRepository(MeteredBillingRunEntity)
    .findOne({ where: { tenantId, billingRunId } });
  if (!run) throw new AppError(MESSAGES.BILLING_RUN_NOT_FOUND, 404, ErrorCode.NOT_FOUND);

  const where: Record<string, unknown> = { tenantId, periodKey: run.periodKey };
  if (run.subjectId) where.subjectId = run.subjectId;
  const [rows, total] = await ds.getRepository(MeteredUsageEventEntity).findAndCount({
    where,
    order: { occurredAt: 'DESC' },
    skip: page * pageSize,
    take: pageSize,
  });
  return { data: rows.map((r) => MeteredUsageEventSchema.parse(r)), total };
}
