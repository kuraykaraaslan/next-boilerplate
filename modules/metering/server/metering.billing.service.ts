import 'reflect-metadata';
import type { MeteredBillingRun, MeteredUsageEvent, OverageComputation } from './metering.types';
import type { BillRunDTO, CreateRunDTO, ListRunsQuery, RunBillingDTO } from './metering.dto';
import { computeOverage } from './metering.billing.compute';
import { runBilling } from './metering.billing.run.service';
import { listRuns, getRun, listRunEvents } from './metering.billing.read.service';
import MeteredBillingWorkflowService from './metering.billing.workflow.service';

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

  static listRunEvents(
    tenantId: string,
    billingRunId: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ data: MeteredUsageEvent[]; total: number }> {
    return listRunEvents(tenantId, billingRunId, page, pageSize);
  }

  // Document workflow: DRAFT → CALCULATED → BILLED.
  static createRun(tenantId: string, dto: CreateRunDTO): Promise<MeteredBillingRun> {
    return MeteredBillingWorkflowService.createRun(tenantId, dto);
  }

  static calculateRun(tenantId: string, billingRunId: string): Promise<MeteredBillingRun> {
    return MeteredBillingWorkflowService.calculateRun(tenantId, billingRunId);
  }

  static billRun(tenantId: string, billingRunId: string, dto: BillRunDTO): Promise<MeteredBillingRun> {
    return MeteredBillingWorkflowService.billRun(tenantId, billingRunId, dto);
  }
}
