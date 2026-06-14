import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/modules/env', () => ({
  env: { DATABASE_URL: 'postgresql://test', NODE_ENV: 'test' },
}));
vi.mock('@/modules/redis', () => ({
  default: { set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1) },
}));
vi.mock('@/modules/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/modules/webhook/webhook.service', () => ({
  default: { dispatchEvent: vi.fn(async () => {}) },
}));
vi.mock('@/modules/db', () => ({ tenantDataSourceFor: vi.fn() }));
const { auditLog, notify } = vi.hoisted(() => ({
  auditLog: vi.fn(async (_input: Record<string, unknown>) => {}),
  notify: vi.fn(async (_tenantId: string, _userId: string, _payload: Record<string, unknown>) => null),
}));
vi.mock('@/modules/audit_log/audit_log.service', () => ({ default: { log: auditLog } }));
vi.mock('@/modules/notification_inapp/notification_inapp.service', () => ({ default: { push: notify } }));

import { tenantDataSourceFor } from '@/modules/db';
import SupportTicketService from '../back_office.support.service';
import { BACK_OFFICE_MESSAGES } from '../back_office.messages';
import { makeFakeDs, type FakeDs } from './fake_ds';

const TENANT = '660e8400-e29b-41d4-a716-446655440000';
const REQUESTER = '770e8400-e29b-41d4-a716-446655440001';
const AGENT = '770e8400-e29b-41d4-a716-446655440002';

let fake: FakeDs;

beforeEach(() => {
  fake = makeFakeDs();
  (tenantDataSourceFor as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue(fake);
  auditLog.mockClear();
  notify.mockClear();
});

function newTicket(overrides: Record<string, unknown> = {}) {
  return SupportTicketService.createTicket(TENANT, {
    requesterUserId: REQUESTER,
    requesterEmail: 'requester@example.com',
    subject: 'Help me',
    body: 'Something is broken',
    priority: 'NORMAL',
    ...overrides,
  });
}

describe('SupportTicketService.createTicket', () => {
  it('opens an OPEN ticket with a first REQUESTER message and an SLA', async () => {
    const ticket = await newTicket();
    expect(ticket.status).toBe('OPEN');
    expect(ticket.ticketNumber).toMatch(/^TICK-\d{4}-00001$/);
    expect(ticket.slaDueAt).toBeInstanceOf(Date);
    expect(ticket.messages).toHaveLength(1);
    expect(ticket.messages[0].authorType).toBe('REQUESTER');
    expect(auditLog).toHaveBeenCalledTimes(1);
  });

  it('assigns sequential per-year ticket numbers', async () => {
    const a = await newTicket();
    const b = await newTicket();
    const c = await newTicket();
    const seqs = [a, b, c].map((t) => Number(t.ticketNumber.split('-').pop()));
    expect(seqs).toEqual([1, 2, 3]);
  });
});

describe('SupportTicketService.reply', () => {
  it('first AGENT reply sets firstResponseAt and flips status to PENDING', async () => {
    const ticket = await newTicket();
    await SupportTicketService.reply(TENANT, {
      ticketId: ticket.ticketId,
      authorUserId: AGENT,
      authorType: 'AGENT',
      body: 'Looking into it',
      internal: false,
    });
    const reloaded = await SupportTicketService.get(TENANT, ticket.ticketId, true);
    expect(reloaded.status).toBe('PENDING');
    expect(reloaded.firstResponseAt).toBeInstanceOf(Date);
    expect(reloaded.messages).toHaveLength(2);
  });

  it('a REQUESTER reply flips status back to OPEN', async () => {
    const ticket = await newTicket();
    await SupportTicketService.reply(TENANT, { ticketId: ticket.ticketId, authorUserId: AGENT, authorType: 'AGENT', body: 'hi', internal: false });
    await SupportTicketService.reply(TENANT, { ticketId: ticket.ticketId, authorUserId: REQUESTER, authorType: 'REQUESTER', body: 'still broken', internal: false });
    const reloaded = await SupportTicketService.get(TENANT, ticket.ticketId, true);
    expect(reloaded.status).toBe('OPEN');
  });

  it('an internal note does not change status and is hidden from the requester view', async () => {
    const ticket = await newTicket();
    await SupportTicketService.reply(TENANT, { ticketId: ticket.ticketId, authorUserId: AGENT, authorType: 'AGENT', body: 'secret note', internal: true });

    const requesterView = await SupportTicketService.get(TENANT, ticket.ticketId, false);
    const agentView = await SupportTicketService.get(TENANT, ticket.ticketId, true);
    expect(requesterView.status).toBe('OPEN'); // internal note didn't flip status
    expect(requesterView.messages).toHaveLength(1); // internal note hidden
    expect(agentView.messages).toHaveLength(2); // internal note visible to agent
  });

  it('rejects a reply to a closed ticket', async () => {
    const ticket = await newTicket();
    await SupportTicketService.close(TENANT, ticket.ticketId, AGENT);
    await expect(
      SupportTicketService.reply(TENANT, { ticketId: ticket.ticketId, authorUserId: REQUESTER, authorType: 'REQUESTER', body: 'reopen?', internal: false }),
    ).rejects.toThrow(BACK_OFFICE_MESSAGES.TICKET_CLOSED);
  });
});

describe('SupportTicketService lifecycle', () => {
  it('resolve sets resolvedAt and RESOLVED status', async () => {
    const ticket = await newTicket();
    const resolved = await SupportTicketService.resolve(TENANT, ticket.ticketId, AGENT);
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
  });

  it('assign sets the agent and notifies them', async () => {
    const ticket = await newTicket();
    const assigned = await SupportTicketService.assign(TENANT, ticket.ticketId, AGENT, AGENT);
    expect(assigned.assignedToUserId).toBe(AGENT);
    expect(notify).toHaveBeenCalled();
    expect(notify.mock.calls.at(-1)?.[1]).toBe(AGENT);
  });

  it('get(404) throws for an unknown ticket', async () => {
    await expect(SupportTicketService.get(TENANT, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      BACK_OFFICE_MESSAGES.TICKET_NOT_FOUND,
    );
  });
});
