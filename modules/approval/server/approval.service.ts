import 'reflect-metadata';
import type { ApprovalChainVerificationResult, ApprovalDecisionHandler, ApprovalQueueItem } from './approval.types';
import type { DecideApprovalDTO, ListApprovalsQuery, SubmitApprovalDTO } from './approval.dto';
import { registerHandler, unregisterHandler } from './approval.handlers';
import { verifyChain } from './approval.chain';
import { list, get } from './approval.read.service';
import { submit, claim } from './approval.submit.service';
import { decide } from './approval.decide.service';

/**
 * Approval-queue service facade. The implementation is split across focused
 * modules (`approval.handlers`, `.chain`, `.read.service`,
 * `.submit.service`, `.decide.service`); this class preserves the single
 * `ApprovalQueueService.*` entry point its callers depend on.
 */
export default class ApprovalQueueService {
  static registerHandler(entityType: string, handler: ApprovalDecisionHandler): void {
    registerHandler(entityType, handler);
  }

  static unregisterHandler(entityType: string): void {
    unregisterHandler(entityType);
  }

  static submit(tenantId: string, dto: SubmitApprovalDTO): Promise<ApprovalQueueItem> {
    return submit(tenantId, dto);
  }

  static list(tenantId: string, query: ListApprovalsQuery): Promise<{ data: ApprovalQueueItem[]; total: number }> {
    return list(tenantId, query);
  }

  static get(tenantId: string, approvalItemId: string): Promise<ApprovalQueueItem> {
    return get(tenantId, approvalItemId);
  }

  static claim(tenantId: string, reviewerUserId: string, approvalItemId: string): Promise<ApprovalQueueItem> {
    return claim(tenantId, reviewerUserId, approvalItemId);
  }

  static decide(tenantId: string, reviewerUserId: string, approvalItemId: string, dto: DecideApprovalDTO): Promise<ApprovalQueueItem> {
    return decide(tenantId, reviewerUserId, approvalItemId, dto);
  }

  static verifyChain(tenantId: string): Promise<ApprovalChainVerificationResult> {
    return verifyChain(tenantId);
  }
}
