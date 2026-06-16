import 'reflect-metadata';
import type { MeteredBillingRun, OverageComputation } from './metering.types';
import type { ListRunsQuery, RunBillingDTO } from './metering.dto';
import { computeOverage } from './metering.billing.compute';
import { runBilling } from './metering.billing.run.service';
import { listRuns, getRun } from './metering.billing.read.service';

/**
 * Metered-billing service facade. The implementation is split across focused
 * modules (`metering.billing.compute`, `metering.billing.run.service`,
 * `metering.billing.read.service`, plus the `metering.billing.helpers`); this
 * class preserves the single `MeteredBillingService.*` entry point.
 */
export default class MeteredBillingService {
  static computeOverage(
    tenantId: string,
    args: { subjectType: string; subjectId: string | null; periodKey: string },
  ): Promise<OverageComputation> {
    return computeOverage(tenantId, args);
  }

  static runBilling(tenantId: string, dto: RunBillingDTO): Promise<MeteredBillingRun> {
    return runBilling(tenantId, dto);
  }

  static listRuns(tenantId: string, query: ListRunsQuery): Promise<{ data: MeteredBillingRun[]; total: number }> {
    return listRuns(tenantId, query);
  }

  static getRun(tenantId: string, billingRunId: string): Promise<MeteredBillingRun> {
    return getRun(tenantId, billingRunId);
  }
}
