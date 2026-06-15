import { describe, it, expect } from 'vitest';
import {
  SubmitApprovalDTO,
  ApprovalActionDTO,
  DecideApprovalDTO,
  ListApprovalsQuery,
} from '../approval.dto';

const UUID = '660e8400-e29b-41d4-a716-446655440001';

describe('SubmitApprovalDTO', () => {
  it('defaults priority to 0 and accepts a known entityType', () => {
    const r = SubmitApprovalDTO.parse({ entityType: 'store_product', entityId: UUID });
    expect(r.priority).toBe(0);
  });

  it('rejects an out-of-range priority', () => {
    expect(SubmitApprovalDTO.safeParse({ entityType: 'x', entityId: UUID, priority: 9 }).success).toBe(false);
  });

  it('rejects an empty entityType', () => {
    expect(SubmitApprovalDTO.safeParse({ entityType: '', entityId: UUID }).success).toBe(false);
  });
});

describe('ApprovalActionDTO / DecideApprovalDTO', () => {
  it('requires a decision when action is decide', () => {
    expect(ApprovalActionDTO.safeParse({ action: 'decide' }).success).toBe(false);
    expect(ApprovalActionDTO.safeParse({ action: 'decide', decision: 'APPROVE' }).success).toBe(true);
  });

  it('allows a bare claim action', () => {
    expect(ApprovalActionDTO.safeParse({ action: 'claim' }).success).toBe(true);
  });

  it('only accepts the three decisions', () => {
    expect(DecideApprovalDTO.safeParse({ decision: 'MAYBE' }).success).toBe(false);
    expect(DecideApprovalDTO.safeParse({ decision: 'ESCALATE' }).success).toBe(true);
  });
});

describe('ListApprovalsQuery', () => {
  it('coerces page/pageSize from strings', () => {
    const r = ListApprovalsQuery.parse({ page: '2', pageSize: '50' });
    expect(r.page).toBe(2);
    expect(r.pageSize).toBe(50);
  });
});
