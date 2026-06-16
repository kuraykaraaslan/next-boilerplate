import { describe, it, expect } from 'vitest';
import {
  CreateTicketDTO,
  ReplyTicketDTO,
  TicketActionDTO,
} from '../support.dto';

const UUID = '660e8400-e29b-41d4-a716-446655440001';

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
