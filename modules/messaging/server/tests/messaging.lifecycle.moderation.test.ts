import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  publishRealtime: vi.fn(async (_event: { kind: string; status?: string; forUserId?: string }) => {}),
  enqueue: vi.fn(async (_job: unknown) => {}),
  decision: { current: { status: 'CLEAN', reason: null as string | null, held: false, runAi: false } },
}));

vi.mock('@kuraykaraaslan/env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('@kuraykaraaslan/redis', () => ({ default: { publish: vi.fn(async () => 0) } }));
vi.mock('@kuraykaraaslan/db', () => ({ tenantDataSourceFor: vi.fn() }));
vi.mock('../messaging.policy.service', () => ({ default: { assertParticipant: vi.fn(async () => ({})) } }));
vi.mock('../messaging.realtime', () => ({ publishRealtime: h.publishRealtime }));
vi.mock('../messaging.moderation.queue', () => ({ enqueue: h.enqueue }));
vi.mock('../messaging.moderation.service', () => ({
  default: {
    loadPolicy: vi.fn(async () => ({ mode: 'AUTO', keywords: { literals: [], regexes: [] }, useAi: false, aiHold: false, aiThreshold: 70, reportThreshold: 0 })),
    scanText: vi.fn(() => ({ flagged: true, matched: ['spam'] })),
    applyPolicy: vi.fn(() => h.decision.current),
    onViolation: vi.fn(async () => {}),
  },
}));

const publishRealtime = h.publishRealtime;
const decisionRef = h.decision;

import { tenantDataSourceFor } from '@kuraykaraaslan/db';

const TENANT = '550e8400-e29b-41d4-a716-446655440000';
const CONV = '550e8400-e29b-41d4-a716-446655440010';
const SENDER = '550e8400-e29b-41d4-a716-446655440020';
const MSG = '550e8400-e29b-41d4-a716-446655440030';

function mockDs() {
  const repo = {
    create: (d: Record<string, unknown>) => d,
    save: async (d: Record<string, unknown>) => ({
      messageId: MSG,
      tenantId: TENANT,
      conversationId: CONV,
      senderUserId: SENDER,
      body: 'hi',
      contentType: 'text',
      attachments: null,
      replyToMessageId: null,
      metadata: null,
      editedAt: null,
      moderationScore: null,
      moderatedByUserId: null,
      moderatedAt: null,
      createdAt: new Date('2026-06-14T00:00:00Z'),
      updatedAt: new Date('2026-06-14T00:00:00Z'),
      deletedAt: null,
      ...d,
    }),
    update: async () => ({}),
  };
  vi.mocked(tenantDataSourceFor).mockResolvedValue({
    transaction: async (cb: (mgr: unknown) => Promise<unknown>) => cb({ getRepository: () => repo }),
    getRepository: () => repo,
  } as never);
}

import MessagingLifecycleService from '../messaging.lifecycle.service';
import type { SendMessageInput } from '../messaging.dto';

const INPUT: SendMessageInput = { body: 'spam', contentType: 'text' };

describe('sendMessage moderation gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDs();
  });

  it('QUARANTINE: a held message never publishes message:new and notifies sender only', async () => {
    decisionRef.current = { status: 'PENDING', reason: 'keyword', held: true, runAi: false };
    await MessagingLifecycleService.sendMessage(TENANT, SENDER, CONV, INPUT);

    const kinds = publishRealtime.mock.calls.map((c) => c[0].kind);
    expect(kinds).not.toContain('message:new');
    expect(kinds).toContain('message:moderated');
    const moderated = publishRealtime.mock.calls.find((c) => c[0].kind === 'message:moderated')![0];
    expect(moderated.status).toBe('PENDING');
    expect(moderated.forUserId).toBe(SENDER);
  });

  it('FLAGGED (LOG/REPORT): the message is delivered via message:new', async () => {
    decisionRef.current = { status: 'FLAGGED', reason: 'keyword', held: false, runAi: false };
    await MessagingLifecycleService.sendMessage(TENANT, SENDER, CONV, INPUT);

    const kinds = publishRealtime.mock.calls.map((c) => c[0].kind);
    expect(kinds).toContain('message:new');
  });
});
