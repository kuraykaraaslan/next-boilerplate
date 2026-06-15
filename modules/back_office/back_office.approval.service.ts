import 'reflect-metadata';
import type { ApprovalChainVerificationResult, ApprovalDecisionHandler, ApprovalQueueItem } from './back_office.types';
import type { DecideApprovalDTO, ListApprovalsQuery, SubmitApprovalDTO } from './back_office.dto';
import { registerHandler, unregisterHandler } from './back_office.approval.handlers';
import { verifyChain } from './back_office.approval.chain';
import { list, get } from './back_office.approval.read.service';
import { submit, claim } from './back_office.approval.submit.service';
import { decide } from './back_office.approval.decide.service';

/**
 * Approval-queue service facade. The implementation is split across focused
 * modules (`back_office.approval.handlers`, `.chain`, `.read.service`,
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
