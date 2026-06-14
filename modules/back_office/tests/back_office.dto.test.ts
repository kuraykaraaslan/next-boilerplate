import { describe, it, expect } from 'vitest';
import {
  SubmitApprovalDTO,
  ApprovalActionDTO,
  DecideApprovalDTO,
  CreateTicketDTO,
  ReplyTicketDTO,
  TicketActionDTO,
  ListApprovalsQuery,
} from '../back_office.dto';

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

describe('CreateTicketDTO', () => {
  it('defaults priority to NORMAL and validates the email', () => {
    const r = CreateTicketDTO.parse({ requesterEmail: 'a@b.com', subject: 'Hi', body: 'Help' });
    expect(r.priority).toBe('NORMAL');
  });

  it('rejects an invalid email', () => {
    expect(CreateTicketDTO.safeParse({ requesterEmail: 'nope', subject: 'Hi', body: 'Help' }).success).toBe(false);
  });
});

describe('ReplyTicketDTO', () => {
  it('coerces internal and defaults it to false', () => {
    const r = ReplyTicketDTO.parse({ ticketId: UUID, authorType: 'AGENT', body: 'hi' });
    expect(r.internal).toBe(false);
  });

  it('requires a non-empty body', () => {
    expect(ReplyTicketDTO.safeParse({ ticketId: UUID, authorType: 'AGENT', body: '' }).success).toBe(false);
  });
});

describe('TicketActionDTO', () => {
  it('requires a status when action is status', () => {
    expect(TicketActionDTO.safeParse({ action: 'status' }).success).toBe(false);
    expect(TicketActionDTO.safeParse({ action: 'status', status: 'RESOLVED' }).success).toBe(true);
  });

  it('allows a bare resolve/close action', () => {
    expect(TicketActionDTO.safeParse({ action: 'resolve' }).success).toBe(true);
    expect(TicketActionDTO.safeParse({ action: 'close' }).success).toBe(true);
  });
});
