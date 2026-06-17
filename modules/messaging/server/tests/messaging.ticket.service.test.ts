import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({
  env: { REDIS_URL: 'redis://test', NODE_ENV: 'test' },
}));

// In-memory Redis stand-in that honours GETDEL single-use semantics.
const store = new Map<string, string>();
vi.mock('@kuraykaraaslan/redis', () => ({
  default: {
    set: vi.fn(async (key: string, val: string) => {
      store.set(key, val);
      return 'OK';
    }),
    call: vi.fn(async (cmd: string, key: string) => {
      if (cmd === 'GETDEL') {
        const v = store.get(key) ?? null;
        store.delete(key);
        return v;
      }
      return null;
    }),
  },
}));

import MessagingTicketService from '../messaging.ticket.service';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '660e8400-e29b-41d4-a716-446655440001';

describe('MessagingTicketService', () => {
  beforeEach(() => store.clear());

  it('mints a ticket and stores its payload under the flat key', async () => {
    const { ticket, expiresIn } = await MessagingTicketService.mintTicket(TENANT_ID, USER_ID);
    expect(ticket).toBeTruthy();
    expect(expiresIn).toBe(MessagingTicketService.TICKET_TTL_SECONDS);
    expect(store.has(MessagingTicketService.ticketKey(ticket))).toBe(true);
  });

  it('consumes a ticket exactly once (single-use, no replay)', async () => {
    const { ticket } = await MessagingTicketService.mintTicket(TENANT_ID, USER_ID);

    const first = await MessagingTicketService.consumeTicket(ticket);
    expect(first).toMatchObject({ tenantId: TENANT_ID, userId: USER_ID });

    const second = await MessagingTicketService.consumeTicket(ticket);
    expect(second).toBeNull();
  });

  it('rejects an unknown / empty ticket', async () => {
    expect(await MessagingTicketService.consumeTicket('does-not-exist')).toBeNull();
    expect(await MessagingTicketService.consumeTicket('')).toBeNull();
  });
});
