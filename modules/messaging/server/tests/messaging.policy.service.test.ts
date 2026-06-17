import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@kuraykaraaslan/env', () => ({ env: { NODE_ENV: 'test' } }));
vi.mock('@kuraykaraaslan/db', () => ({ tenantDataSourceFor: vi.fn() }));

import MessagingPolicyService from '../messaging.policy.service';
import { tenantDataSourceFor } from '@kuraykaraaslan/db';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const CONV_ID = '770e8400-e29b-41d4-a716-446655440002';

function mockDsWithParticipant(participant: Record<string, unknown> | null) {
  const repo = { findOne: vi.fn(async () => participant) };
  vi.mocked(tenantDataSourceFor).mockResolvedValue({ getRepository: () => repo } as never);
}

const baseParticipant = {
  participantId: '880e8400-e29b-41d4-a716-446655440003',
  tenantId: TENANT_ID,
  conversationId: CONV_ID,
  userId: USER_ID,
  role: 'member',
  lastReadMessageId: null,
  lastReadAt: null,
  lastDeliveredMessageId: null,
  mutedUntil: null,
  joinedAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('hasParticipantRole', () => {
  it('respects the owner > admin > member hierarchy', () => {
    expect(MessagingPolicyService.hasParticipantRole('owner', 'admin')).toBe(true);
    expect(MessagingPolicyService.hasParticipantRole('admin', 'admin')).toBe(true);
    expect(MessagingPolicyService.hasParticipantRole('member', 'admin')).toBe(false);
    expect(MessagingPolicyService.hasParticipantRole('member', 'member')).toBe(true);
  });
});

describe('assertParticipant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the membership when the user is an active participant', async () => {
    mockDsWithParticipant(baseParticipant);
    const p = await MessagingPolicyService.assertParticipant(TENANT_ID, USER_ID, CONV_ID);
    expect(p.userId).toBe(USER_ID);
  });

  it('throws 403 when the user is not a participant', async () => {
    mockDsWithParticipant(null);
    await expect(MessagingPolicyService.assertParticipant(TENANT_ID, USER_ID, CONV_ID)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('assertCanManageParticipants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('forbids a plain member from managing participants', async () => {
    mockDsWithParticipant({ ...baseParticipant, role: 'member' });
    await expect(
      MessagingPolicyService.assertCanManageParticipants(TENANT_ID, USER_ID, CONV_ID),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('allows an admin to manage participants', async () => {
    mockDsWithParticipant({ ...baseParticipant, role: 'admin' });
    const p = await MessagingPolicyService.assertCanManageParticipants(TENANT_ID, USER_ID, CONV_ID);
    expect(p.role).toBe('admin');
  });
});
